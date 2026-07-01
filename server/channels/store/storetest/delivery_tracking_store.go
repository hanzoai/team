// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

package storetest

import (
	"testing"

	"github.com/mattermost/mattermost/server/public/model"
	"github.com/mattermost/mattermost/server/public/shared/request"
	"github.com/mattermost/mattermost/server/v8/channels/store"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestDeliveryTrackingStore(t *testing.T, rctx request.CTX, ss store.Store, s SqlStore) {
	t.Run("SaveAndGetTrackedChannels", func(t *testing.T) { testSaveAndGetTrackedChannels(t, rctx, ss) })
	t.Run("SaveTrackedChannelsReplacesExisting", func(t *testing.T) { testSaveTrackedChannelsReplacesExisting(t, rctx, ss) })
	t.Run("SaveTrackedChannelsDeduplicates", func(t *testing.T) { testSaveTrackedChannelsDeduplicates(t, rctx, ss) })
	t.Run("SaveTrackedChannelsEmptyClears", func(t *testing.T) { testSaveTrackedChannelsEmptyClears(t, rctx, ss) })
}

func testSaveAndGetTrackedChannels(t *testing.T, rctx request.CTX, ss store.Store) {
	channelIDs := []string{model.NewId(), model.NewId()}

	err := ss.DeliveryTracking().SaveTrackedChannels(rctx, channelIDs)
	require.NoError(t, err)

	got, err := ss.DeliveryTracking().GetTrackedChannelIDs(rctx)
	require.NoError(t, err)
	assert.ElementsMatch(t, channelIDs, got)
}

func testSaveTrackedChannelsReplacesExisting(t *testing.T, rctx request.CTX, ss store.Store) {
	initial := []string{model.NewId(), model.NewId()}
	require.NoError(t, ss.DeliveryTracking().SaveTrackedChannels(rctx, initial))

	replacement := []string{model.NewId()}
	require.NoError(t, ss.DeliveryTracking().SaveTrackedChannels(rctx, replacement))

	got, err := ss.DeliveryTracking().GetTrackedChannelIDs(rctx)
	require.NoError(t, err)
	assert.ElementsMatch(t, replacement, got)
}

func testSaveTrackedChannelsDeduplicates(t *testing.T, rctx request.CTX, ss store.Store) {
	channelID := model.NewId()
	other := model.NewId()

	err := ss.DeliveryTracking().SaveTrackedChannels(rctx, []string{channelID, channelID, other, ""})
	require.NoError(t, err)

	got, err := ss.DeliveryTracking().GetTrackedChannelIDs(rctx)
	require.NoError(t, err)
	assert.ElementsMatch(t, []string{channelID, other}, got)
}

func testSaveTrackedChannelsEmptyClears(t *testing.T, rctx request.CTX, ss store.Store) {
	require.NoError(t, ss.DeliveryTracking().SaveTrackedChannels(rctx, []string{model.NewId()}))

	require.NoError(t, ss.DeliveryTracking().SaveTrackedChannels(rctx, []string{}))

	got, err := ss.DeliveryTracking().GetTrackedChannelIDs(rctx)
	require.NoError(t, err)
	assert.Empty(t, got)
}
