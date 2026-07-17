// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

package api4

import (
	"context"
	"net/http"
	"testing"
	"time"

	"github.com/mattermost/mattermost/server/public/model"
	"github.com/stretchr/testify/require"
)

func requireContentReviewEventuallyEmpty(t *testing.T, th *TestHelper, postID string) {
	t.Helper()
	require.Eventually(t, func() bool {
		count, err := th.App.Srv().Store().UserPostDeliveryContentReview().CountByReviewPost(context.Background(), postID)
		return err == nil && count == 0
	}, 10*time.Second, 100*time.Millisecond, "expected content-review rows for post %s to be purged", postID)
}

func TestReviewerActionsPurgeDeliveryTrackingContentReview(t *testing.T) {
	th := Setup(t).InitBasic(t)
	client := th.Client

	rowsFor := func(postID string) []model.UserPostDelivery {
		return []model.UserPostDelivery{
			{PostID: postID, TargetID: th.BasicUser2.Id, TargetType: model.DeliveryTargetUser, Mechanism: model.DeliveryMechanismProduct, CreatedAt: model.GetMillis()},
			{PostID: postID, TargetID: "com.example.plugin", TargetType: model.DeliveryTargetPlugin, Mechanism: model.DeliveryMechanismPlugin, CreatedAt: model.GetMillis()},
		}
	}

	t.Run("keep purges the content-review recipient rows", func(t *testing.T) {
		setupDeliveryTrackingReviewer(t, th)
		defer th.RemoveLicense(t)

		post := th.CreatePost(t)
		flagPostViaAPI(t, client, post.Id)
		seedContentReviewRows(t, th, post.Id, rowsFor(post.Id))

		count, err := th.App.Srv().Store().UserPostDeliveryContentReview().CountByReviewPost(context.Background(), post.Id)
		require.NoError(t, err)
		require.Equal(t, int64(2), count)

		resp, err := client.KeepFlaggedPost(context.Background(), post.Id, &model.FlagContentActionRequest{Comment: "keeping this post"})
		require.NoError(t, err)
		require.Equal(t, http.StatusOK, resp.StatusCode)

		requireContentReviewEventuallyEmpty(t, th, post.Id)
	})

	t.Run("remove purges the content-review recipient rows", func(t *testing.T) {
		setupDeliveryTrackingReviewer(t, th)
		defer th.RemoveLicense(t)

		post := th.CreatePost(t)
		flagPostViaAPI(t, client, post.Id)
		seedContentReviewRows(t, th, post.Id, rowsFor(post.Id))

		count, err := th.App.Srv().Store().UserPostDeliveryContentReview().CountByReviewPost(context.Background(), post.Id)
		require.NoError(t, err)
		require.Equal(t, int64(2), count)

		resp, err := client.RemoveFlaggedPost(context.Background(), post.Id, &model.FlagContentActionRequest{Comment: "removing this post"})
		require.NoError(t, err)
		require.Equal(t, http.StatusOK, resp.StatusCode)

		requireContentReviewEventuallyEmpty(t, th, post.Id)
	})
}
