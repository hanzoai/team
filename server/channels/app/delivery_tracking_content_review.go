// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

package app

import (
	"net/http"
	"slices"
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

	merged, err := a.Srv().Store().Job().PatchJobData(job.Id, model.StringMap{jobDataKeyRequestedBy: requestedBy}, mergeRequestedBy)
	if err != nil {
		rctx.Logger().Warn("Failed to record content-review requester on job",
			mlog.String("job_id", job.Id), mlog.String("user_id", requestedBy), mlog.Err(err))
	} else if merged != nil {
		job.Data = merged
	}

	return job, nil
}

// mergeRequestedBy adds the requester carried in patch to the requested_by CSV set
// of existing. It is a pure function of its inputs so it is safe to re-run on a
// serializable-transaction retry.
func mergeRequestedBy(existing, patch model.StringMap) model.StringMap {
	existing[jobDataKeyRequestedBy] = appendToCSVSet(existing[jobDataKeyRequestedBy], patch[jobDataKeyRequestedBy])
	return existing
}

func appendToCSVSet(csv, value string) string {
	if value == "" {
		return csv
	}
	if csv == "" {
		return value
	}
	if slices.Contains(strings.Split(csv, ","), value) {
		return csv
	}
	return csv + "," + value
}
