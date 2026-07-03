// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

package app

import (
	"net/http"
	"strings"

	"github.com/mattermost/mattermost/server/public/model"
	"github.com/mattermost/mattermost/server/public/shared/request"
)

// CreateDeliveryTrackingContentReviewJob triggers the background job that copies
// a flagged post's delivery-tracking rows into the primary-DB content-review
// table. It enforces feature enablement and that the post is under review, then
// deduplicates across concurrent reviewer triggers by reusing an in-flight job.
//
// Access control (that the requester is a content reviewer of the post's team)
// is the caller's responsibility (the REST handler in a sibling ticket);
// teamID/requestedBy are carried on the job for downstream use (completion DM).
func (a *App) CreateDeliveryTrackingContentReviewJob(rctx request.CTX, postID, teamID, requestedBy string) (*model.Job, *model.AppError) {
	if !a.Config().PostDeliveryTrackingEnabled() {
		return nil, model.NewAppError("CreateDeliveryTrackingContentReviewJob", "app.job.error", nil, "post delivery tracking is not enabled", http.StatusForbidden)
	}

	// The post must be flagged and still under review (Pending or Assigned).
	// GetPostContentFlaggingPropertyValue returns 404 when the post has no
	// content-flagging status, i.e. it is not flagged.
	status, appErr := a.GetPostContentFlaggingPropertyValue(postID, ContentFlaggingPropertyNameStatus)
	if appErr != nil {
		if appErr.StatusCode == http.StatusNotFound {
			return nil, model.NewAppError("CreateDeliveryTrackingContentReviewJob", "app.job.error", nil, "post is not flagged", http.StatusBadRequest)
		}
		return nil, appErr
	}

	switch strings.Trim(string(status.Value), `"`) {
	case model.ContentFlaggingStatusPending, model.ContentFlaggingStatusAssigned:
		// Reviewable.
	default:
		return nil, model.NewAppError("CreateDeliveryTrackingContentReviewJob", "app.job.error", nil, "post is not under review", http.StatusBadRequest)
	}

	// Deduplicate across concurrent reviewer triggers: if a job is already pending
	// or in progress for this post, reuse it rather than creating a duplicate.
	// useMaster=true narrows the create-race window; any residual duplicate is
	// harmless because the copy is idempotent (ON CONFLICT DO NOTHING).
	existing, err := a.Srv().Store().Job().GetByTypeAndData(rctx, model.JobTypeDeliveryTrackingContentReview, map[string]string{"post_id": postID}, true, model.JobStatusPending, model.JobStatusInProgress)
	if err != nil {
		return nil, model.NewAppError("CreateDeliveryTrackingContentReviewJob", "app.job.error", nil, "", http.StatusInternalServerError).Wrap(err)
	}
	if len(existing) > 0 {
		return existing[0], nil
	}

	return a.Srv().Jobs.CreateJob(rctx, model.JobTypeDeliveryTrackingContentReview, map[string]string{
		"post_id":      postID,
		"team_id":      teamID,
		"requested_by": requestedBy,
	})
}
