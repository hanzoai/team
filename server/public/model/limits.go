// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

package model

// The plugin API exposes GetCloudLimits and the OnCloudLimitsUpdated hook, and
// third-party plugins are compiled against those signatures. The billing
// product they described is gone; the types stay so the RPC surface a plugin
// binary was built against still resolves. This server reports no limits.

type FilesLimits struct {
	TotalStorage *int64 `json:"total_storage"`
}

type MessagesLimits struct {
	History *int `json:"history"`
}

type TeamsLimits struct {
	Active *int `json:"active"`
}

type ProductLimits struct {
	Files    *FilesLimits    `json:"files,omitempty"`
	Messages *MessagesLimits `json:"messages,omitempty"`
	Teams    *TeamsLimits    `json:"teams,omitempty"`
}
