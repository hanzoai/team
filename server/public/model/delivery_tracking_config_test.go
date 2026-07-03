// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

package model

import (
	"testing"

	"github.com/stretchr/testify/require"
)

func TestDeliveryTrackingConfigSetDefaults(t *testing.T) {
	t.Run("zero value gets safe defaults", func(t *testing.T) {
		c := DeliveryTrackingConfig{}
		c.SetDefaults()

		require.NotNil(t, c.Enable)
		require.False(t, *c.Enable)
		require.NotNil(t, c.EnableForAllChannels)
		require.True(t, *c.EnableForAllChannels) // defaults to tracking all channels
		require.NotNil(t, c.ChannelIds)
		require.Empty(t, c.ChannelIds)
	})

	t.Run("does not overwrite provided values", func(t *testing.T) {
		id := NewId()
		c := DeliveryTrackingConfig{
			Enable:               NewPointer(true),
			EnableForAllChannels: NewPointer(false),
			ChannelIds:           []string{id},
		}
		c.SetDefaults()

		require.True(t, *c.Enable)
		require.False(t, *c.EnableForAllChannels)
		require.Equal(t, []string{id}, c.ChannelIds)
	})
}

func TestDeliveryTrackingConfigIsValid(t *testing.T) {
	t.Run("all-channels mode is valid regardless of channel ids", func(t *testing.T) {
		c := &DeliveryTrackingConfig{Enable: NewPointer(true), EnableForAllChannels: NewPointer(true)}
		c.SetDefaults()
		require.Nil(t, c.IsValid())
	})

	t.Run("selected-channels mode with no channels is invalid", func(t *testing.T) {
		c := &DeliveryTrackingConfig{
			Enable:               NewPointer(true),
			EnableForAllChannels: NewPointer(false),
			ChannelIds:           []string{},
		}
		appErr := c.IsValid()
		require.NotNil(t, appErr)
		require.Contains(t, appErr.Id, "all_channels")
	})

	t.Run("selected-channels mode with a valid channel id is valid", func(t *testing.T) {
		c := &DeliveryTrackingConfig{
			Enable:               NewPointer(true),
			EnableForAllChannels: NewPointer(false),
			ChannelIds:           []string{NewId()},
		}
		require.Nil(t, c.IsValid())
	})

	t.Run("an invalid channel id is rejected", func(t *testing.T) {
		c := &DeliveryTrackingConfig{
			Enable:               NewPointer(true),
			EnableForAllChannels: NewPointer(false),
			ChannelIds:           []string{"not-a-valid-id"},
		}
		appErr := c.IsValid()
		require.NotNil(t, appErr)
		require.Contains(t, appErr.Id, "channel_id")
	})
}
