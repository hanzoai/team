// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

package app

import (
	"net/http"
	"strings"

	"github.com/mattermost/mattermost/server/public/model"
	"github.com/mattermost/mattermost/server/public/shared/mlog"
	"github.com/mattermost/mattermost/server/public/shared/request"
)

const (
	jobDataKeyPostId      = "post_id"
	jobDataKeyTeamId      = "team_id"
	jobDataKeyRequestedBy = "requested_by"
)

func (a *App) CreateDeliveryTrackingContentReviewJob(rctx request.CTX, postID, teamID, requestedBy string) (*model.Job, *model.AppError) {
	if !a.Config().PostDeliveryTrackingEnabled() {
		return nil, model.NewAppError("CreateDeliveryTrackingContentReviewJob", "app.job.error", nil, "post delivery tracking is not enabled", http.StatusForbidden)
	}

	status, appErr := a.GetPostContentFlaggingPropertyValue(postID, ContentFlaggingPropertyNameStatus)
	if appErr != nil {
		if appErr.StatusCode == http.StatusNotFound {
			return nil, model.NewAppError("CreateDeliveryTrackingContentReviewJob", "app.job.error", nil, "post is not flagged", http.StatusBadRequest)
		}
		return nil, appErr
	}

	reviewStatus := strings.Trim(string(status.Value), `"`)
	if reviewStatus != model.ContentFlaggingStatusPending && reviewStatus != model.ContentFlaggingStatusAssigned {
		return nil, model.NewAppError("CreateDeliveryTrackingContentReviewJob", "app.job.error", nil, "post is not under review", http.StatusBadRequest)
	}

	job, appErr := a.Srv().Jobs.CreateJobOnce(
		rctx,
		model.JobTypeDeliveryTrackingContentReview,
		map[string]string{jobDataKeyPostId: postID, jobDataKeyTeamId: teamID, jobDataKeyRequestedBy: requestedBy},
		map[string]string{jobDataKeyPostId: postID},
	)
	if appErr != nil {
		return nil, appErr
	}

	if !strings.Contains(job.Data[jobDataKeyRequestedBy], requestedBy) {
		if err := a.Srv().Store().Job().AppendToJobDataCSV(job.Id, jobDataKeyRequestedBy, requestedBy); err != nil {
			rctx.Logger().Warn("Failed to record content-review requester on job",
				mlog.String("job_id", job.Id), mlog.String("user_id", requestedBy), mlog.Err(err))
		}
	}

	return job, nil
}
