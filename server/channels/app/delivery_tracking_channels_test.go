// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

package app

import (
	"testing"
	"time"

	"github.com/stretchr/testify/require"

	"github.com/mattermost/mattermost/server/public/model"
)

// saveTrackedChannels persists the given channel IDs as the delivery-tracked set
// directly through the store layer. Reviewer settings are required by the store
// call but left empty.
func saveTrackedChannels(t *testing.T, th *TestHelper, channelIDs ...string) {
	t.Helper()
	err := th.App.Srv().Store().ContentFlagging().SaveSettings(model.ContentFlaggingSettingsRequest{
		ReviewerSettings: &model.ReviewSettingsRequest{
			ReviewerIDsSettings: model.ReviewerIDsSettings{
				CommonReviewerIds:    []string{},
				TeamReviewersSetting: map[string]*model.TeamReviewerSetting{},
			},
		},
		DeliveryTracking: &model.DeliveryTrackingConfig{ChannelIds: channelIDs},
	})
	require.NoError(t, err)
}

func TestReloadDeliveryTrackedChannels(t *testing.T) {
	mainHelper.Parallel(t)
	th := Setup(t)

	tracked := model.NewId()
	saveTrackedChannels(t, th, tracked)

	err := th.App.Channels().reloadDeliveryTrackedChannels(th.Context, th.App.Srv().Store())
	require.NoError(t, err)

	require.True(t, th.App.Channels().isChannelDeliveryTracked(tracked))
	require.False(t, th.App.Channels().isChannelDeliveryTracked(model.NewId()))
}

func TestClusterInvalidateDeliveryTrackedChannelsHandler(t *testing.T) {
	mainHelper.Parallel(t)
	th := Setup(t)

	// Snapshot starts empty (startup reload found nothing).
	require.False(t, th.App.Channels().isChannelDeliveryTracked("anything"))

	tracked := model.NewId()
	saveTrackedChannels(t, th, tracked)

	// The handler reloads the snapshot from the store; the message payload is ignored.
	th.App.Channels().clusterInvalidateDeliveryTrackedChannelsHandler(&model.ClusterMessage{
		Event: clusterEventInvalidateDeliveryTrackedChannels,
	})

	require.True(t, th.App.Channels().isChannelDeliveryTracked(tracked))
}

// Not parallel: it mutates the package-level backoff var.
func TestScheduleDeliveryTrackedChannelsReloadRetry(t *testing.T) {
	th := Setup(t)

	t.Run("collapses concurrent retries to a single goroutine", func(t *testing.T) {
		ch := th.App.Channels()

		// Simulate an in-flight retry; a second schedule must be a no-op.
		require.True(t, ch.deliveryTrackedChannelsRetryInFlight.CompareAndSwap(false, true))
		defer ch.deliveryTrackedChannelsRetryInFlight.Store(false)

		require.False(t, ch.scheduleDeliveryTrackedChannelsReloadRetry())
	})

	t.Run("retry reloads the snapshot", func(t *testing.T) {
		ch := th.App.Channels()

		// Shrink the backoff so the retry fires promptly.
		origDelay := deliveryTrackedChannelsRetryInitialDelay
		deliveryTrackedChannelsRetryInitialDelay = time.Millisecond
		defer func() { deliveryTrackedChannelsRetryInitialDelay = origDelay }()

		tracked := model.NewId()
		saveTrackedChannels(t, th, tracked)

		// Clear the snapshot so we can observe the retry repopulating it.
		empty := map[string]struct{}{}
		ch.deliveryTrackedChannels.Store(&empty)
		require.False(t, ch.isChannelDeliveryTracked(tracked))

		require.False(t, ch.deliveryTrackedChannelsRetryInFlight.Load())
		require.True(t, ch.scheduleDeliveryTrackedChannelsReloadRetry())

		require.Eventually(t, func() bool {
			return ch.isChannelDeliveryTracked(tracked) && !ch.deliveryTrackedChannelsRetryInFlight.Load()
		}, 2*time.Second, 5*time.Millisecond)
	})
}

// TestSaveContentFlaggingConfigDeliveryTracking exercises the delivery-tracking
// branch of SaveContentFlaggingConfig / GetContentFlaggingSettings (feature flag on):
// the config switches are applied, the tracked-channel snapshot is reloaded, and
// the settings round-trip through GetContentFlaggingSettings.
func TestSaveContentFlaggingConfigDeliveryTracking(t *testing.T) {
	mainHelper.Parallel(t)
	th := Setup(t)
	enableDeliveryTracking(th)

	channelID := model.NewId()
	config := model.ContentFlaggingSettingsRequest{
		ContentFlaggingSettingsBase: model.ContentFlaggingSettingsBase{
			EnableContentFlagging: model.NewPointer(true),
		},
		ReviewerSettings: &model.ReviewSettingsRequest{
			ReviewerSettings: model.ReviewerSettings{
				CommonReviewers: model.NewPointer(true),
			},
			ReviewerIDsSettings: model.ReviewerIDsSettings{
				CommonReviewerIds: []string{model.NewId()},
			},
		},
		DeliveryTracking: &model.DeliveryTrackingConfig{
			Enable:               model.NewPointer(true),
			EnableForAllChannels: model.NewPointer(false),
			ChannelIds:           []string{channelID},
		},
	}
	config.SetDefaults(true)

	appErr := th.App.SaveContentFlaggingConfig(th.Context, config)
	require.Nil(t, appErr)

	// Config switches are applied from the request.
	require.True(t, *th.App.Config().DeliveryTrackingSettings.Enable)
	require.False(t, *th.App.Config().DeliveryTrackingSettings.EnableForAllChannels)

	// The in-memory tracked-channels snapshot is reloaded as a side effect of saving.
	require.True(t, th.App.Channels().isChannelDeliveryTracked(channelID))

	// GetContentFlaggingSettings echoes the persisted delivery tracking config.
	got, appErr := th.App.GetContentFlaggingSettings()
	require.Nil(t, appErr)
	require.NotNil(t, got.DeliveryTracking)
	require.True(t, *got.DeliveryTracking.Enable)
	require.False(t, *got.DeliveryTracking.EnableForAllChannels)
	require.Equal(t, []string{channelID}, got.DeliveryTracking.ChannelIds)
}
