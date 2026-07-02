// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

package model

import "net/http"

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
	if !*c.EnableForAllChannels && len(c.ChannelIds) == 0 {
		return NewAppError("DeliveryTrackingConfig.IsValid", "model.delivery_tracking.is_valid.all_channels.app_error", nil, "", http.StatusBadRequest)
	}

	for _, channelID := range c.ChannelIds {
		if !IsValidId(channelID) {
			return NewAppError("DeliveryTrackingConfig.IsValid", "model.delivery_tracking.is_valid.channel_id.app_error", nil, "", http.StatusBadRequest)
		}
	}

	return nil
}
