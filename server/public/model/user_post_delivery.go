// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

package model

const (
	DeliveryMechanismUnknown         int16 = 0
	DeliveryMechanismProduct         int16 = 1 // viewed within the Mattermost product (web/desktop/mobile UI or API)
	DeliveryMechanismEmail           int16 = 2 // email notification
	DeliveryMechanismPush            int16 = 3 // push notification
	DeliveryMechanismOutgoingWebhook int16 = 4 // outgoing webhook payload
	DeliveryMechanismPlugin          int16 = 5 // delivered to a server plugin
)

const (
	DeliveryTargetUser    = "user"
	DeliveryTargetPlugin  = "plugin"
	DeliveryTargetWebhook = "webhook"
)

type UserPostDelivery struct {
	PostID     string `json:"post_id" db:"post_id"`
	TargetID   string `json:"target_id" db:"target_id"`
	TargetType string `json:"target_type" db:"target_type"`
	Mechanism  int16  `json:"mechanism" db:"mechanism"`
	CreatedAt  int64  `json:"created_at" db:"created_at"`
}

// UserPostDeliveryCursor is a keyset-pagination cursor over the
// UserPostDelivery unique index (post_id fixed, ordered by
// target_id, target_type, mechanism). The zero value (empty TargetID) selects
// the first page; target ids are never empty in practice, so this is an
// unambiguous sentinel.
type UserPostDeliveryCursor struct {
	TargetID   string
	TargetType string
	Mechanism  int16
}

// IsFirstPage reports whether the cursor points at the first page.
func (c UserPostDeliveryCursor) IsFirstPage() bool {
	return c.TargetID == ""
}
