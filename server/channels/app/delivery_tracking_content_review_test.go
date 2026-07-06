// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

package app

import (
	"encoding/json"
	"net/http"
	"strings"
	"testing"

	"github.com/stretchr/testify/require"

	"github.com/mattermost/mattermost/server/public/model"
)

func TestCreateDeliveryTrackingContentReviewJob(t *testing.T) {
	mainHelper.Parallel(t)
	th := Setup(t).InitBasic(t)

	th.App.Srv().SetLicense(model.NewTestLicenseSKU(model.LicenseShortSkuEnterpriseAdvanced))

	// Enable content flagging with BasicUser as a common reviewer so posts can be
	// flagged (which sets the "Pending" status the trigger requires).
	contentFlaggingConfig := model.ContentFlaggingSettingsRequest{}
	contentFlaggingConfig.SetDefaults(false)
	contentFlaggingConfig.ReviewerSettings.CommonReviewers = model.NewPointer(true)
	contentFlaggingConfig.ReviewerSettings.CommonReviewerIds = []string{th.BasicUser.Id}
	contentFlaggingConfig.AdditionalSettings.ReporterCommentRequired = model.NewPointer(false)
	contentFlaggingConfig.AdditionalSettings.HideFlaggedContent = model.NewPointer(false)
	contentFlaggingConfig.AdditionalSettings.Reasons = &[]string{"spam", "harassment", "inappropriate"}
	require.Nil(t, th.App.SaveContentFlaggingConfig(th.Context, contentFlaggingConfig))

	t.Run("returns forbidden when the feature is disabled", func(t *testing.T) {
		_, appErr := th.App.CreateDeliveryTrackingContentReviewJob(th.Context, model.NewId(), th.BasicTeam.Id, th.BasicUser.Id)
		require.NotNil(t, appErr)
		require.Equal(t, http.StatusForbidden, appErr.StatusCode)
	})

	enableDeliveryTracking(th)

	t.Run("rejects a post that is not flagged", func(t *testing.T) {
		post := th.CreatePost(t, th.BasicChannel)
		_, appErr := th.App.CreateDeliveryTrackingContentReviewJob(th.Context, post.Id, th.BasicTeam.Id, th.BasicUser.Id)
		require.NotNil(t, appErr)
		require.Equal(t, http.StatusBadRequest, appErr.StatusCode)
	})

	t.Run("rejects a flagged post that is no longer under review", func(t *testing.T) {
		post := setupFlaggedPost(t, th)

		// Move the post to a terminal status so it is flagged but no longer in a
		// reviewable (Pending/Assigned) state.
		groupID, appErr := th.App.ContentFlaggingGroupId()
		require.Nil(t, appErr)
		statusValue, appErr := th.App.GetPostContentFlaggingPropertyValue(post.Id, ContentFlaggingPropertyNameStatus)
		require.Nil(t, appErr)
		statusValue.Value = json.RawMessage(`"` + model.ContentFlaggingStatusRemoved + `"`)
		_, appErr = th.App.UpdatePropertyValue(th.Context, groupID, statusValue)
		require.Nil(t, appErr)

		_, appErr = th.App.CreateDeliveryTrackingContentReviewJob(th.Context, post.Id, th.BasicTeam.Id, th.BasicUser.Id)
		require.NotNil(t, appErr)
		require.Equal(t, http.StatusBadRequest, appErr.StatusCode)
	})

	t.Run("creates a job for a flagged post and reuses it for concurrent triggers", func(t *testing.T) {
		post := setupFlaggedPost(t, th)

		job, appErr := th.App.CreateDeliveryTrackingContentReviewJob(th.Context, post.Id, th.BasicTeam.Id, th.BasicUser.Id)
		require.Nil(t, appErr)
		require.NotNil(t, job)
		require.Equal(t, model.JobTypeDeliveryTrackingContentReview, job.Type)
		require.Equal(t, post.Id, job.Data["post_id"])
		require.Equal(t, th.BasicTeam.Id, job.Data["team_id"])
		require.Equal(t, th.BasicUser.Id, job.Data["requested_by"])

		// A second trigger (even by a different reviewer) while the first job is
		// still pending must return the same job, not create a duplicate.
		job2, appErr := th.App.CreateDeliveryTrackingContentReviewJob(th.Context, post.Id, th.BasicTeam.Id, th.BasicUser2.Id)
		require.Nil(t, appErr)
		require.Equal(t, job.Id, job2.Id, "concurrent triggers should reuse the in-flight job")

		// Both reviewers are accumulated in requested_by (comma-separated, deduped)
		// so the completion notification can reach everyone who asked.
		refetched, err := th.App.Srv().Store().Job().Get(th.Context, job.Id)
		require.NoError(t, err)
		require.ElementsMatch(t, []string{th.BasicUser.Id, th.BasicUser2.Id}, strings.Split(refetched.Data["requested_by"], ","))

		// A repeat trigger by an existing requester does not duplicate the entry.
		_, appErr = th.App.CreateDeliveryTrackingContentReviewJob(th.Context, post.Id, th.BasicTeam.Id, th.BasicUser2.Id)
		require.Nil(t, appErr)
		refetched, err = th.App.Srv().Store().Job().Get(th.Context, job.Id)
		require.NoError(t, err)
		require.ElementsMatch(t, []string{th.BasicUser.Id, th.BasicUser2.Id}, strings.Split(refetched.Data["requested_by"], ","))
	})
}
