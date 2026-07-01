// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

package sqlstore

import (
	"github.com/pkg/errors"

	"github.com/mattermost/mattermost/server/public/shared/request"
	"github.com/mattermost/mattermost/server/v8/channels/store"
)

// SqlDeliveryTrackingStore persists the set of channels with post-delivery
// tracking enabled (used when DeliveryTrackingSettings.EnableForAllChannels is
// false). It lives in the primary DB; the second, write-heavy delivery-record
// pool is handled separately by UserPostDeliveryStore.
type SqlDeliveryTrackingStore struct {
	*SqlStore
}

func newSqlDeliveryTrackingStore(sqlStore *SqlStore) store.DeliveryTrackingStore {
	return &SqlDeliveryTrackingStore{SqlStore: sqlStore}
}

// SaveTrackedChannels replaces the full set of tracked channels with the given
// IDs (deduplicated). An empty slice clears the table. Mirrors the
// delete-all-then-insert pattern used by the content-flagging settings store.
func (s *SqlDeliveryTrackingStore) SaveTrackedChannels(rctx request.CTX, channelIDs []string) (err error) {
	tx, err := s.GetMaster().Begin()
	if err != nil {
		return errors.Wrap(err, "SqlDeliveryTrackingStore.SaveTrackedChannels: begin_transaction")
	}
	defer finalizeTransactionX(tx, &err)

	deleteBuilder := s.getQueryBuilder().Delete("PostDeliveryTrackingChannels")
	if _, err = tx.ExecBuilder(deleteBuilder); err != nil {
		return errors.Wrap(err, "SqlDeliveryTrackingStore.SaveTrackedChannels: delete_existing")
	}

	seen := make(map[string]struct{}, len(channelIDs))
	insertBuilder := s.getQueryBuilder().
		Insert("PostDeliveryTrackingChannels").
		Columns("ChannelId")
	hasRows := false
	for _, channelID := range channelIDs {
		if channelID == "" {
			continue
		}
		if _, ok := seen[channelID]; ok {
			continue
		}
		seen[channelID] = struct{}{}
		insertBuilder = insertBuilder.Values(channelID)
		hasRows = true
	}

	if hasRows {
		if _, err = tx.ExecBuilder(insertBuilder); err != nil {
			return errors.Wrap(err, "SqlDeliveryTrackingStore.SaveTrackedChannels: insert_new")
		}
	}

	if err = tx.Commit(); err != nil {
		return errors.Wrap(err, "SqlDeliveryTrackingStore.SaveTrackedChannels: commit_transaction")
	}

	return nil
}

// GetTrackedChannelIDs returns the IDs of all channels with delivery tracking
// enabled. The read honors the request context, so callers that need a
// read-after-write (e.g. refreshing the in-memory snapshot after a save) can
// force a master read via request.RequestContextWithMaster.
func (s *SqlDeliveryTrackingStore) GetTrackedChannelIDs(rctx request.CTX) ([]string, error) {
	query := s.getQueryBuilder().
		Select("ChannelId").
		From("PostDeliveryTrackingChannels")

	channelIDs := []string{}
	if err := s.DBXFromContext(rctx.Context()).SelectBuilder(&channelIDs, query); err != nil {
		return nil, errors.Wrap(err, "SqlDeliveryTrackingStore.GetTrackedChannelIDs: select")
	}

	return channelIDs, nil
}
