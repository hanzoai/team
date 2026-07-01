// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

package app

import (
	"net/http"
	"time"

	"github.com/mattermost/mattermost/server/public/model"
	"github.com/mattermost/mattermost/server/public/shared/mlog"
	"github.com/mattermost/mattermost/server/public/shared/request"
	"github.com/mattermost/mattermost/server/v8/channels/store"
)

// Backoff bounds for the delivery-tracked-channels snapshot reload retry.
// Package vars (not consts) so tests can shrink them.
var (
	deliveryTrackedChannelsRetryInitialDelay = 1 * time.Second
	deliveryTrackedChannelsRetryMaxDelay     = 5 * time.Minute
)

const clusterEventInvalidateDeliveryTrackedChannels = model.ClusterEvent("inv_delivery_tracked_channels")

// reloadDeliveryTrackedChannels loads the set of channels with post-delivery
// tracking enabled and atomically replaces the in-memory snapshot. Used at
// startup (from NewChannels), after a config save, and from the cluster
// invalidation handler. Forces a master read because all callers can race with
// replica lag after a write.
func (ch *Channels) reloadDeliveryTrackedChannels(rctx request.CTX, s store.Store) error {
	channelIDs, err := s.DeliveryTracking().GetTrackedChannelIDs(store.RequestContextWithMaster(rctx))
	if err != nil {
		return err
	}

	fresh := make(map[string]struct{}, len(channelIDs))
	for _, id := range channelIDs {
		fresh[id] = struct{}{}
	}

	ch.deliveryTrackedChannels.Store(&fresh)
	return nil
}

// isChannelDeliveryTracked reports whether channelID is in the selected-channel
// snapshot. Lock-free: a single atomic pointer load plus a map lookup.
func (ch *Channels) isChannelDeliveryTracked(channelID string) bool {
	m := ch.deliveryTrackedChannels.Load()
	if m == nil {
		return false
	}
	_, ok := (*m)[channelID]
	return ok
}

// clusterInvalidateDeliveryTrackedChannelsHandler is the receive-side handler
// for clusterEventInvalidateDeliveryTrackedChannels. It refetches the entire
// set (the payload is intentionally empty).
func (ch *Channels) clusterInvalidateDeliveryTrackedChannelsHandler(msg *model.ClusterMessage) {
	rctx := request.EmptyContext(ch.srv.Log())
	if err := ch.reloadDeliveryTrackedChannels(rctx, ch.srv.Store()); err != nil {
		ch.srv.Log().Warn(
			"Failed to reload post-delivery tracking channel snapshot after cluster invalidation; retry scheduled",
			mlog.String("event", string(msg.Event)),
			mlog.Err(err),
		)
		ch.scheduleDeliveryTrackedChannelsReloadRetry()
	}
}

// broadcastDeliveryTrackedChannelsInvalidation tells the rest of the cluster to
// refetch their snapshots. The payload is intentionally empty.
func (ch *Channels) broadcastDeliveryTrackedChannelsInvalidation() {
	cluster := ch.srv.platform.Cluster()
	if cluster == nil {
		return
	}

	cluster.SendClusterMessage(&model.ClusterMessage{
		Event:            clusterEventInvalidateDeliveryTrackedChannels,
		SendType:         model.ClusterSendReliable,
		WaitForAllToSend: true,
	})
}

// scheduleDeliveryTrackedChannelsReloadRetry kicks off a single in-flight retry
// goroutine that reloads the snapshot with exponential backoff until success or
// shutdown. Concurrent calls collapse to a single retry.
func (ch *Channels) scheduleDeliveryTrackedChannelsReloadRetry() bool {
	if !ch.deliveryTrackedChannelsRetryInFlight.CompareAndSwap(false, true) {
		return false
	}
	go ch.runDeliveryTrackedChannelsReloadRetry()
	return true
}

func (ch *Channels) runDeliveryTrackedChannelsReloadRetry() {
	defer ch.deliveryTrackedChannelsRetryInFlight.Store(false)
	rctx := request.EmptyContext(ch.srv.Log())

	delay := deliveryTrackedChannelsRetryInitialDelay
	for attempt := 1; ; attempt++ {
		timer := time.NewTimer(delay)
		select {
		case <-ch.interruptQuitChan:
			timer.Stop()
			ch.srv.Log().Info(
				"Post-delivery tracking channel snapshot reload retry cancelled by shutdown",
				mlog.Int("attempt", attempt),
			)
			return
		case <-timer.C:
		}

		if err := ch.reloadDeliveryTrackedChannels(rctx, ch.srv.Store()); err != nil {
			ch.srv.Log().Info(
				"Post-delivery tracking channel snapshot reload retry attempt failed; will retry",
				mlog.Int("attempt", attempt),
				mlog.Err(err),
			)
			delay *= 2
			if delay > deliveryTrackedChannelsRetryMaxDelay {
				delay = deliveryTrackedChannelsRetryMaxDelay
			}
			continue
		}

		ch.srv.Log().Info(
			"Post-delivery tracking channel snapshot reload retry succeeded",
			mlog.Int("attempt", attempt),
		)
		return
	}
}

// GetDeliveryTrackingConfig returns the admin-facing post-delivery-tracking
// configuration: the master Enable and EnableForAllChannels toggles (from
// config) merged with the selected channel IDs (from the DB).
func (a *App) GetDeliveryTrackingConfig(rctx request.CTX) (*model.DeliveryTrackingConfig, *model.AppError) {
	channelIDs, err := a.Srv().Store().DeliveryTracking().GetTrackedChannelIDs(rctx)
	if err != nil {
		return nil, model.NewAppError("GetDeliveryTrackingConfig", "app.delivery_tracking.get_channels.app_error", nil, "", http.StatusInternalServerError).Wrap(err)
	}

	dtSettings := a.Config().DeliveryTrackingSettings
	return &model.DeliveryTrackingConfig{
		Enable:               dtSettings.Enable,
		EnableForAllChannels: dtSettings.EnableForAllChannels,
		ChannelIds:           channelIDs,
	}, nil
}

// SaveDeliveryTrackingConfig persists the selected channel set to the DB and
// the Enable/EnableForAllChannels toggles to config, then refreshes the local
// snapshot and broadcasts a cluster invalidation. The infra pool fields of
// DeliveryTrackingSettings are left untouched (mutated in place, not replaced).
func (a *App) SaveDeliveryTrackingConfig(rctx request.CTX, config model.DeliveryTrackingConfig) *model.AppError {
	if err := a.Srv().Store().DeliveryTracking().SaveTrackedChannels(rctx, config.ChannelIds); err != nil {
		return model.NewAppError("SaveDeliveryTrackingConfig", "app.delivery_tracking.save_channels.app_error", nil, "", http.StatusInternalServerError).Wrap(err)
	}

	a.UpdateConfig(func(cfg *model.Config) {
		cfg.DeliveryTrackingSettings.Enable = config.Enable
		cfg.DeliveryTrackingSettings.EnableForAllChannels = config.EnableForAllChannels
	})

	ch := a.Channels()
	if err := ch.reloadDeliveryTrackedChannels(rctx, a.Srv().Store()); err != nil {
		a.Srv().Log().Warn(
			"Failed to reload post-delivery tracking channel snapshot after save; retry scheduled",
			mlog.Err(err),
		)
		ch.scheduleDeliveryTrackedChannelsReloadRetry()
	}
	ch.broadcastDeliveryTrackedChannelsInvalidation()

	return nil
}
