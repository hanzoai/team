// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

package app

import (
	"net/http"
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
	cfCfg := model.ContentFlaggingSettingsRequest{}
	cfCfg.SetDefaults(false)
	cfCfg.ReviewerSettings.CommonReviewers = model.NewPointer(true)
	cfCfg.ReviewerSettings.CommonReviewerIds = []string{th.BasicUser.Id}
	cfCfg.AdditionalSettings.ReporterCommentRequired = model.NewPointer(false)
	cfCfg.AdditionalSettings.HideFlaggedContent = model.NewPointer(false)
	cfCfg.AdditionalSettings.Reasons = &[]string{"spam", "harassment", "inappropriate"}
	require.Nil(t, th.App.SaveContentFlaggingConfig(th.Context, cfCfg))

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
	})
}
