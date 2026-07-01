// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

package model

import "net/http"

// DeliveryTrackingConfig is the admin-facing post-delivery-tracking
// configuration surfaced on the Data Spillage Handling System Console page.
//
// Enable and EnableForAllChannels are persisted to DeliveryTrackingSettings
// (config.json); ChannelIds is persisted to the PostDeliveryTrackingChannels
// table. The API merges the two sources into this single shape. ChannelIds is
// only meaningful when EnableForAllChannels is false.
type DeliveryTrackingConfig struct {
	Enable               *bool    `json:"enable"`
	EnableForAllChannels *bool    `json:"enable_for_all_channels"`
	ChannelIds           []string `json:"channel_ids"`
}

func (c *DeliveryTrackingConfig) SetDefaults() {
	if c.Enable == nil {
		c.Enable = new(false)
	}

	if c.EnableForAllChannels == nil {
		c.EnableForAllChannels = new(true)
	}

	if c.ChannelIds == nil {
		c.ChannelIds = []string{}
	}
}

func (c *DeliveryTrackingConfig) IsValid() *AppError {
	for _, channelID := range c.ChannelIds {
		if !IsValidId(channelID) {
			return NewAppError("DeliveryTrackingConfig.IsValid", "model.delivery_tracking.is_valid.channel_id.app_error", nil, "", http.StatusBadRequest)
		}
	}

	return nil
}
