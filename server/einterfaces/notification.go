// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

package einterfaces

import (
	"github.com/hanzoteam/server/server/public/model"
	"github.com/hanzoteam/server/server/public/shared/request"
)

type NotificationInterface interface {
	GetNotificationMessage(rctx request.CTX, ack *model.PushNotificationAck, userID string) (*model.PushNotification, *model.AppError)
	CheckLicense() *model.AppError
}
