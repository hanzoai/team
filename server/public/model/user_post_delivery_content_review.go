// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

package model

// UserPostDeliveryContentReview is a row in the primary-DB content-review table.
// It mirrors a UserPostDelivery source row (post_id/target_id/target_type/
// mechanism/created_at, where created_at is the original delivery time) plus
// bookkeeping about the copy: CopiedAt (when the row was copied into the
// content-review table) and JobID (the job that produced it).
type UserPostDeliveryContentReview struct {
	PostID     string `json:"post_id" db:"post_id"`
	TargetID   string `json:"target_id" db:"target_id"`
	TargetType string `json:"target_type" db:"target_type"`
	Mechanism  int16  `json:"mechanism" db:"mechanism"`
	CreatedAt  int64  `json:"created_at" db:"created_at"`
	CopiedAt   int64  `json:"copied_at" db:"copied_at"`
	JobID      string `json:"job_id" db:"job_id"`
}
