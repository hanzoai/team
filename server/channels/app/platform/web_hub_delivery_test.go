// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

package platform

import (
	"testing"

	"github.com/stretchr/testify/require"
)

func TestHubRecordPostDelivery(t *testing.T) {
	t.Run("records the (postID, userID) pair", func(t *testing.T) {
		var gotPostID, gotUserID string
		h := &Hub{platform: &PlatformService{
			postDeliveryRecorder: func(postID, userID string) {
				gotPostID = postID
				gotUserID = userID
			},
		}}

		h.recordPostDelivery("post1", "u1")

		require.Equal(t, "post1", gotPostID)
		require.Equal(t, "u1", gotUserID)
	})

	t.Run("no-op when the recorder is not wired", func(t *testing.T) {
		h := &Hub{platform: &PlatformService{}}
		require.NotPanics(t, func() { h.recordPostDelivery("post1", "u1") })
	})

	t.Run("no-op when postID or userID is empty", func(t *testing.T) {
		called := false
		h := &Hub{platform: &PlatformService{
			postDeliveryRecorder: func(string, string) { called = true },
		}}

		h.recordPostDelivery("", "u1")
		h.recordPostDelivery("post1", "")

		require.False(t, called)
	})
}
