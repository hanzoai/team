// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

package api4

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"slices"
	"strings"

	"github.com/mattermost/mattermost/server/v8/channels/app"

	"github.com/mattermost/mattermost/server/public/model"
	"github.com/mattermost/mattermost/server/public/shared/mlog"
)

func (api *API) InitContentFlagging() {
	if !api.srv.Config().FeatureFlags.ContentFlagging {
		return
	}

	api.BaseRoutes.ContentFlagging.Handle("/flag/config", api.APISessionRequired(contentFlaggingRequired(getFlaggingConfiguration))).Methods(http.MethodGet)
	api.BaseRoutes.ContentFlagging.Handle("/team/{team_id:[A-Za-z0-9]+}/status", api.APISessionRequired(contentFlaggingRequired(getTeamPostFlaggingFeatureStatus))).Methods(http.MethodGet)
	api.BaseRoutes.ContentFlagging.Handle("/post/{post_id:[A-Za-z0-9]+}/flag", api.APISessionRequired(contentFlaggingRequired(flagPost))).Methods(http.MethodPost)
	api.BaseRoutes.ContentFlagging.Handle("/fields", api.APISessionRequired(contentFlaggingRequired(getContentFlaggingFields))).Methods(http.MethodGet)
	api.BaseRoutes.ContentFlagging.Handle("/post/{post_id:[A-Za-z0-9]+}/field_values", api.APISessionRequired(contentFlaggingRequired(getPostPropertyValues))).Methods(http.MethodGet)
	api.BaseRoutes.ContentFlagging.Handle("/post/{post_id:[A-Za-z0-9]+}", api.APISessionRequired(contentFlaggingRequired(getFlaggedPost))).Methods(http.MethodGet)
	api.BaseRoutes.ContentFlagging.Handle("/post/{post_id:[A-Za-z0-9]+}/remove", api.APISessionRequired(contentFlaggingRequired(removeFlaggedPost))).Methods(http.MethodPut)
	api.BaseRoutes.ContentFlagging.Handle("/post/{post_id:[A-Za-z0-9]+}/keep", api.APISessionRequired(contentFlaggingRequired(keepFlaggedPost))).Methods(http.MethodPut)
	api.BaseRoutes.ContentFlagging.Handle("/post/{post_id:[A-Za-z0-9]+}/report", api.APISessionRequired(contentFlaggingRequired(generateFlaggedPostReport))).Methods(http.MethodPost)
	api.BaseRoutes.ContentFlagging.Handle("/team/{team_id:[A-Za-z0-9]+}/reviewers/search", api.APISessionRequired(contentFlaggingRequired(searchReviewers))).Methods(http.MethodGet)
	api.BaseRoutes.ContentFlagging.Handle("/post/{post_id:[A-Za-z0-9]+}/assign/{content_reviewer_id:[A-Za-z0-9]+}", api.APISessionRequired(contentFlaggingRequired(assignFlaggedPostReviewer))).Methods(http.MethodPost)
	api.BaseRoutes.ContentFlagging.Handle("/post/{post_id:[A-Za-z0-9]+}/delivery_tracking", api.APISessionRequired(contentFlaggingRequired(triggerDeliveryTracking))).Methods(http.MethodPost)
	api.BaseRoutes.ContentFlagging.Handle("/post/{post_id:[A-Za-z0-9]+}/delivery_tracking/report", api.APISessionRequired(contentFlaggingRequired(generateDeliveryTrackingReceipt))).Methods(http.MethodGet)

	api.BaseRoutes.ContentFlagging.Handle("/config", api.APISessionRequired(saveContentFlaggingSettings)).Methods(http.MethodPut)
	api.BaseRoutes.ContentFlagging.Handle("/config", api.APISessionRequired(getContentFlaggingSettings)).Methods(http.MethodGet)
}

func requireContentFlaggingAvailable(c *Context) {
	if !model.MinimumEnterpriseAdvancedLicense(c.App.License()) {
		c.Err = model.NewAppError("requireContentFlaggingEnabled", "api.data_spillage.error.license", nil, "", http.StatusNotImplemented)
		return
	}
}

func requireContentFlaggingEnabled(c *Context) {
	requireContentFlaggingAvailable(c)
	if c.Err != nil {
		return
	}

	contentFlaggingEnabled := c.App.Config().ContentFlaggingSettings.EnableContentFlagging
	if contentFlaggingEnabled == nil || !*contentFlaggingEnabled {
		c.Err = model.NewAppError("requireContentFlaggingEnabled", "api.data_spillage.error.disabled", nil, "", http.StatusNotImplemented)
		return
	}
}

func contentFlaggingRequired(h handlerFunc) handlerFunc {
	return func(c *Context, w http.ResponseWriter, r *http.Request) {
		requireContentFlaggingEnabled(c)
		if c.Err != nil {
			return
		}

		h(c, w, r)
	}
}

func requireTeamContentReviewer(c *Context, userId, teamId string) {
	isReviewer, appErr := c.App.IsUserTeamContentReviewer(userId, teamId)
	if appErr != nil {
		c.Err = appErr
		return
	}

	if !isReviewer {
		c.Err = model.NewAppError("requireTeamContentReviewer", "api.data_spillage.error.user_not_reviewer", nil, "", http.StatusForbidden)
		return
	}
}

// requireFlaggedPost verifies the post is flagged and returns its status property
// value; it returns nil (and sets c.Err) when the post is missing or not flagged.
func requireFlaggedPost(c *Context, postId string) *model.PropertyValue {
	if postId == "" {
		c.SetInvalidParam("flagged_post_id")
		return nil
	}

	status, appErr := c.App.GetPostContentFlaggingPropertyValue(postId, app.ContentFlaggingPropertyNameStatus)
	if appErr != nil {
		c.Err = appErr
		return nil
	}

	return status
}

func requireDeliveryTrackingEnabled(c *Context) {
	if !c.App.Config().PostDeliveryTrackingEnabled() {
		c.Err = model.NewAppError("requireDeliveryTrackingEnabled", "api.data_spillage.error.delivery_tracking_disabled", nil, "", http.StatusNotImplemented)
	}
}

// requirePostUnderReview requires the post to be flagged and under review
// (Pending/Assigned); it mirrors the check in CreateDeliveryTrackingContentReviewJob.
func requirePostUnderReview(c *Context, postId string) {
	status := requireFlaggedPost(c, postId)
	if c.Err != nil {
		return
	}

	reviewStatus := strings.Trim(string(status.Value), `"`)
	if reviewStatus != model.ContentFlaggingStatusPending && reviewStatus != model.ContentFlaggingStatusAssigned {
		c.Err = model.NewAppError("requirePostUnderReview", "api.data_spillage.delivery_tracking.receipt.not_under_review", nil, "", http.StatusBadRequest)
		return
	}
}

func getFlaggingConfiguration(c *Context, w http.ResponseWriter, r *http.Request) {
	if c.Err != nil {
		return
	}

	// A team ID is expected to be specified by a content reviewer.
	// When specified, we verify that the user is a content reviewer of the team.
	// If the user is indeed a content reviewer, we return the configuration along with some extra fields
	// that only a reviewer should be aware of.
	// If no team ID is specified, we return the configuration as is, without the extra fields.
	// This is the expected usage for non-reviewers.
	teamId := r.URL.Query().Get("team_id")
	asReviewer := false
	if teamId != "" {
		requireTeamContentReviewer(c, c.AppContext.Session().UserId, teamId)
		if c.Err != nil {
			return
		}

		asReviewer = true
	}

	config := getFlaggingConfig(c.App.Config().ContentFlaggingSettings, asReviewer)

	if err := json.NewEncoder(w).Encode(config); err != nil {
		c.Logger.Warn("Error while writing response", mlog.Err(err))
		c.Err = model.NewAppError("getFlaggingConfiguration", "api.encoding_error", nil, "", http.StatusInternalServerError).Wrap(err)
	}
}

func getTeamPostFlaggingFeatureStatus(c *Context, w http.ResponseWriter, r *http.Request) {
	if c.Err != nil {
		return
	}

	c.RequireTeamId()
	if c.Err != nil {
		return
	}

	teamID := c.Params.TeamId
	if !c.App.SessionHasPermissionToTeam(*c.AppContext.Session(), teamID, model.PermissionViewTeam) {
		c.SetPermissionError(model.PermissionViewTeam)
		return
	}

	enabled, appErr := c.App.ContentFlaggingEnabledForTeam(teamID)
	if appErr != nil {
		c.Err = appErr
		return
	}

	payload := map[string]bool{
		"enabled": enabled,
	}

	if err := json.NewEncoder(w).Encode(payload); err != nil {
		c.Logger.Warn("Error while writing response", mlog.Err(err))
		c.Err = model.NewAppError("getTeamPostFlaggingFeatureStatus", "api.encoding_error", nil, "", http.StatusInternalServerError).Wrap(err)
	}
}

func flagPost(c *Context, w http.ResponseWriter, r *http.Request) {
	if c.Err != nil {
		return
	}

	c.RequirePostId()
	if c.Err != nil {
		return
	}

	var flagRequest model.FlagContentRequest
	if err := json.NewDecoder(r.Body).Decode(&flagRequest); err != nil {
		c.SetInvalidParamWithErr("flagPost", err)
		return
	}

	postId := c.Params.PostId
	userId := c.AppContext.Session().UserId

	auditRec := c.MakeAuditRecord(model.AuditEventFlagPost, model.AuditStatusFail)
	defer c.LogAuditRecWithLevel(auditRec, app.LevelContent)
	model.AddEventParameterToAuditRec(auditRec, "postId", postId)
	model.AddEventParameterToAuditRec(auditRec, "userId", userId)

	post, appErr, _ := c.App.GetPostIfAuthorized(c.AppContext, postId, c.AppContext.Session(), false)
	if appErr != nil {
		c.Err = appErr
		return
	}

	checkPostTypeFlaggable(c, post)
	if c.Err != nil {
		return
	}

	channel, appErr := c.App.GetChannel(c.AppContext, post.ChannelId)
	if appErr != nil {
		c.Err = appErr
		return
	}

	enabled, appErr := c.App.ContentFlaggingEnabledForTeam(channel.TeamId)
	if appErr != nil {
		c.Err = appErr
		return
	}

	if !enabled {
		c.Err = model.NewAppError("flagPost", "api.data_spillage.error.not_available_on_team", nil, "", http.StatusBadRequest)
		return
	}

	appErr = c.App.FlagPost(c.AppContext, post, channel.TeamId, userId, flagRequest)
	if appErr != nil {
		c.Err = appErr
		return
	}

	auditRec.Success()
	auditRec.AddEventObjectType("post")

	writeOKResponse(w)
}

func getFlaggingConfig(contentFlaggingSettings model.ContentFlaggingSettings, asReviewer bool) *model.ContentFlaggingReportingConfig {
	config := &model.ContentFlaggingReportingConfig{
		Reasons:                 contentFlaggingSettings.AdditionalSettings.Reasons,
		ReporterCommentRequired: contentFlaggingSettings.AdditionalSettings.ReporterCommentRequired,
		ReviewerCommentRequired: contentFlaggingSettings.AdditionalSettings.ReviewerCommentRequired,
	}

	if asReviewer {
		config.NotifyReporterOnRemoval = new(slices.Contains(contentFlaggingSettings.NotificationSettings.EventTargetMapping[model.EventContentRemoved], model.TargetReporter))

		config.NotifyReporterOnDismissal = new(slices.Contains(contentFlaggingSettings.NotificationSettings.EventTargetMapping[model.EventContentDismissed], model.TargetReporter))
	}

	return config
}

func getContentFlaggingFields(c *Context, w http.ResponseWriter, r *http.Request) {
	if c.Err != nil {
		return
	}

	groupId, err := c.App.ContentFlaggingGroupId()
	if err != nil {
		c.Err = model.NewAppError("getContentFlaggingGroupId", "app.data_spillage.get_group.error", nil, "", http.StatusInternalServerError).Wrap(err)
		return
	}

	mappedFields, appErr := c.App.GetContentFlaggingMappedFields(groupId)
	if appErr != nil {
		c.Err = appErr
		return
	}

	if err := json.NewEncoder(w).Encode(mappedFields); err != nil {
		c.Logger.Warn("Error while writing response", mlog.Err(err))
		c.Err = model.NewAppError("getContentFlaggingFields", "api.encoding_error", nil, "", http.StatusInternalServerError).Wrap(err)
	}
}

func getPostPropertyValues(c *Context, w http.ResponseWriter, r *http.Request) {
	if c.Err != nil {
		return
	}

	c.RequirePostId()
	if c.Err != nil {
		return
	}

	// The requesting user must be a reviewer of the post's team
	// to be able to fetch the post's Content Flagging property values
	postId := c.Params.PostId
	post, appErr := c.App.GetSinglePost(c.AppContext, postId, true)
	if appErr != nil {
		c.Err = appErr
		return
	}

	channel, appErr := c.App.GetChannel(c.AppContext, post.ChannelId)
	if appErr != nil {
		c.Err = appErr
		return
	}

	userId := c.AppContext.Session().UserId
	requireTeamContentReviewer(c, userId, channel.TeamId)
	if c.Err != nil {
		return
	}

	propertyValues, appErr := c.App.GetPostContentFlaggingPropertyValues(postId)
	if appErr != nil {
		c.Err = appErr
		return
	}

	if err := json.NewEncoder(w).Encode(propertyValues); err != nil {
		c.Logger.Warn("Error while writing response", mlog.Err(err))
		c.Err = model.NewAppError("getPostPropertyValues", "api.encoding_error", nil, "", http.StatusInternalServerError).Wrap(err)
	}
}

func getFlaggedPost(c *Context, w http.ResponseWriter, r *http.Request) {
	if c.Err != nil {
		return
	}

	c.RequirePostId()
	if c.Err != nil {
		return
	}

	// A user can obtain a flagged post if-
	// 1. The post is currently flagged and in any status
	// 2. The user is a reviewer of the post's team

	// check if user is a reviewer of the post's team
	postId := c.Params.PostId
	userId := c.AppContext.Session().UserId

	auditRec := c.MakeAuditRecord(model.AuditEventGetFlaggedPost, model.AuditStatusFail)
	defer c.LogAuditRecWithLevel(auditRec, app.LevelContent)
	model.AddEventParameterToAuditRec(auditRec, "postId", postId)
	model.AddEventParameterToAuditRec(auditRec, "userId", userId)

	post, appErr := c.App.GetSinglePost(c.AppContext, postId, true)
	if appErr != nil {
		c.Err = appErr
		return
	}

	channel, appErr := c.App.GetChannel(c.AppContext, post.ChannelId)
	if appErr != nil {
		c.Err = appErr
		return
	}

	requireTeamContentReviewer(c, userId, channel.TeamId)
	if c.Err != nil {
		return
	}

	// This validates that the post is flagged
	requireFlaggedPost(c, postId)
	if c.Err != nil {
		return
	}

	post = c.App.PreparePostForClientWithEmbedsAndImages(c.AppContext, post, &model.PreparePostForClientOpts{IncludePriority: true, RetainContent: true, IncludeDeleted: true})
	post, isMemberForPreviews, err := c.App.SanitizePostMetadataForUser(c.AppContext, post, c.AppContext.Session().UserId)
	if err != nil {
		c.Err = err
		return
	}

	if err := post.EncodeJSON(w); err != nil {
		c.Err = model.NewAppError("getFlaggedPost", "api.marshal_error", nil, "", http.StatusInternalServerError).Wrap(err)
		return
	}

	if !isMemberForPreviews {
		previewPost := post.GetPreviewPost()
		if previewPost != nil {
			model.AddEventParameterToAuditRec(auditRec, "preview_post_id", previewPost.Post.Id)
		}
		model.AddEventParameterToAuditRec(auditRec, "non_channel_member_access", true)
	}

	auditRec.Success()
}

func removeFlaggedPost(c *Context, w http.ResponseWriter, r *http.Request) {
	actionRequest, userId, post := keepRemoveFlaggedPostChecks(c, r)
	if c.Err != nil {
		c.Err.Where = "removeFlaggedPost"
		return
	}

	auditRec := c.MakeAuditRecord(model.AuditEventPermanentlyRemoveFlaggedPost, model.AuditStatusFail)
	defer c.LogAuditRecWithLevel(auditRec, app.LevelContent)
	model.AddEventParameterToAuditRec(auditRec, "postId", post.Id)
	model.AddEventParameterToAuditRec(auditRec, "userId", userId)

	if appErr := c.App.PermanentDeleteFlaggedPost(c.AppContext, actionRequest, userId, post); appErr != nil {
		c.Err = appErr
		return
	}

	auditRec.Success()
	writeOKResponse(w)
}

func keepFlaggedPost(c *Context, w http.ResponseWriter, r *http.Request) {
	actionRequest, userId, post := keepRemoveFlaggedPostChecks(c, r)
	if c.Err != nil {
		c.Err.Where = "keepFlaggedPost"
		return
	}

	auditRec := c.MakeAuditRecord(model.AuditEventKeepFlaggedPost, model.AuditStatusFail)
	defer c.LogAuditRecWithLevel(auditRec, app.LevelContent)
	model.AddEventParameterToAuditRec(auditRec, "postId", post.Id)
	model.AddEventParameterToAuditRec(auditRec, "userId", userId)

	if appErr := c.App.KeepFlaggedPost(c.AppContext, actionRequest, userId, post); appErr != nil {
		c.Err = appErr
		return
	}

	auditRec.Success()
	writeOKResponse(w)
}

func keepRemoveFlaggedPostChecks(c *Context, r *http.Request) (*model.FlagContentActionRequest, string, *model.Post) {
	if c.Err != nil {
		return nil, "", nil
	}

	c.RequirePostId()
	if c.Err != nil {
		return nil, "", nil
	}

	var actionRequest model.FlagContentActionRequest
	if err := json.NewDecoder(r.Body).Decode(&actionRequest); err != nil {
		c.SetInvalidParamWithErr("flagContentActionRequestBody", err)
		return nil, "", nil
	}

	postId := c.Params.PostId
	userId := c.AppContext.Session().UserId

	post, appErr := c.App.GetSinglePost(c.AppContext, postId, true)
	if appErr != nil {
		c.Err = appErr
		return nil, "", nil
	}

	channel, appErr := c.App.GetChannel(c.AppContext, post.ChannelId)
	if appErr != nil {
		c.Err = appErr
		return nil, "", nil
	}

	requireTeamContentReviewer(c, userId, channel.TeamId)
	if c.Err != nil {
		return nil, "", nil
	}

	commentRequired := c.App.Config().ContentFlaggingSettings.AdditionalSettings.ReviewerCommentRequired
	if err := actionRequest.IsValid(*commentRequired); err != nil {
		c.Err = err
		return nil, "", nil
	}

	return &actionRequest, userId, post
}

func saveContentFlaggingSettings(c *Context, w http.ResponseWriter, r *http.Request) {
	requireContentFlaggingAvailable(c)
	if c.Err != nil {
		return
	}

	var config model.ContentFlaggingSettingsRequest
	if err := json.NewDecoder(r.Body).Decode(&config); err != nil {
		c.SetInvalidParamWithErr("config", err)
		return
	}

	auditRec := c.MakeAuditRecord(model.AuditEventUpdateContentFlaggingConfig, model.AuditStatusFail)
	defer c.LogAuditRec(auditRec)

	if !c.App.SessionHasPermissionTo(*c.AppContext.Session(), model.PermissionManageSystem) {
		c.SetPermissionError(model.PermissionManageSystem)
		return
	}

	deliveryTrackingEnabled := c.App.Config().FeatureFlags.PostDeliveryTracking
	config.SetDefaults(deliveryTrackingEnabled)
	if appErr := config.IsValid(deliveryTrackingEnabled); appErr != nil {
		c.Err = appErr
		return
	}

	appErr := c.App.SaveContentFlaggingConfig(c.AppContext, config)
	if appErr != nil {
		c.Err = appErr
		return
	}

	auditRec.Success()
	writeOKResponse(w)
}

func getContentFlaggingSettings(c *Context, w http.ResponseWriter, r *http.Request) {
	requireContentFlaggingAvailable(c)
	if c.Err != nil {
		return
	}

	if !c.App.SessionHasPermissionTo(*c.AppContext.Session(), model.PermissionManageSystem) {
		c.SetPermissionError(model.PermissionManageSystem)
		return
	}

	fullConfig, appErr := c.App.GetContentFlaggingSettings()
	if appErr != nil {
		c.Err = appErr
		return
	}

	if err := json.NewEncoder(w).Encode(fullConfig); err != nil {
		c.Logger.Warn("Error while writing response", mlog.Err(err))
		c.Err = model.NewAppError("getContentFlaggingSettings", "api.encoding_error", nil, "", http.StatusInternalServerError).Wrap(err)
	}
}

func searchReviewers(c *Context, w http.ResponseWriter, r *http.Request) {
	if c.Err != nil {
		return
	}

	c.RequireTeamId()
	if c.Err != nil {
		return
	}

	teamId := c.Params.TeamId
	userId := c.AppContext.Session().UserId
	searchTerm := strings.TrimSpace(r.URL.Query().Get("term"))

	requireTeamContentReviewer(c, userId, teamId)
	if c.Err != nil {
		return
	}

	reviewers, appErr := c.App.SearchReviewers(c.AppContext, searchTerm, teamId)
	if appErr != nil {
		c.Err = appErr
		return
	}

	if err := json.NewEncoder(w).Encode(reviewers); err != nil {
		c.Logger.Warn("Error while writing response", mlog.Err(err))
		c.Err = model.NewAppError("searchReviewers", "api.encoding_error", nil, "", http.StatusInternalServerError).Wrap(err)
	}
}

func assignFlaggedPostReviewer(c *Context, w http.ResponseWriter, r *http.Request) {
	if c.Err != nil {
		return
	}

	c.RequirePostId()
	if c.Err != nil {
		return
	}

	c.RequireContentReviewerId()
	if c.Err != nil {
		return
	}

	postId := c.Params.PostId
	post, appErr := c.App.GetSinglePost(c.AppContext, postId, true)
	if appErr != nil {
		c.Err = appErr
		return
	}

	channel, appErr := c.App.GetChannel(c.AppContext, post.ChannelId)
	if appErr != nil {
		c.Err = appErr
		return
	}

	assignedBy := c.AppContext.Session().UserId
	requireTeamContentReviewer(c, assignedBy, channel.TeamId)
	if c.Err != nil {
		return
	}

	reviewerId := c.Params.ContentReviewerId
	requireTeamContentReviewer(c, reviewerId, channel.TeamId)
	if c.Err != nil {
		return
	}

	auditRec := c.MakeAuditRecord(model.AuditEventSetReviewer, model.AuditStatusFail)
	defer c.LogAuditRec(auditRec)
	model.AddEventParameterToAuditRec(auditRec, "assigningUserId", assignedBy)
	model.AddEventParameterToAuditRec(auditRec, "reviewerUserId", reviewerId)

	appErr = c.App.AssignFlaggedPostReviewer(c.AppContext, postId, channel.TeamId, reviewerId, assignedBy)
	if appErr != nil {
		c.Err = appErr
		return
	}

	auditRec.Success()
	writeOKResponse(w)
}

func triggerDeliveryTracking(c *Context, w http.ResponseWriter, r *http.Request) {
	if c.Err != nil {
		return
	}

	requireDeliveryTrackingEnabled(c)
	if c.Err != nil {
		return
	}

	c.RequirePostId()
	if c.Err != nil {
		return
	}

	postId := c.Params.PostId
	userId := c.AppContext.Session().UserId

	auditRec := c.MakeAuditRecord(model.AuditEventTriggerDeliveryTracking, model.AuditStatusFail)
	defer c.LogAuditRecWithLevel(auditRec, app.LevelContent)
	model.AddEventParameterToAuditRec(auditRec, "postId", postId)
	model.AddEventParameterToAuditRec(auditRec, "userId", userId)

	post, appErr := c.App.GetSinglePost(c.AppContext, postId, true)
	if appErr != nil {
		c.Err = appErr
		return
	}

	channel, appErr := c.App.GetChannel(c.AppContext, post.ChannelId)
	if appErr != nil {
		c.Err = appErr
		return
	}

	// Only a content reviewer of the post's team may trigger delivery tracking.
	requireTeamContentReviewer(c, userId, channel.TeamId)
	if c.Err != nil {
		return
	}

	if channel.IsGroupOrDirect() {
		c.Err = model.NewAppError("triggerDeliveryTracking", "api.data_spillage.delivery_tracking.dm_gm_not_supported", nil, "", http.StatusBadRequest)
		return
	}

	// If a successful copy job already produced the data, it is ready to view.
	// Existing data wins regardless of the channel's current per-channel setting.
	dataReady, appErr := c.App.DeliveryTrackingContentReviewJobExists(c.AppContext, postId, model.JobStatusSuccess)
	if appErr != nil {
		c.Err = appErr
		return
	}
	if dataReady {
		auditRec.Success()
		ReturnStatusOK(w)
		return
	}

	inFlight, appErr := c.App.DeliveryTrackingContentReviewJobExists(c.AppContext, postId, model.JobStatusPending, model.JobStatusInProgress)
	if appErr != nil {
		c.Err = appErr
		return
	}

	if !inFlight && !c.App.DeliveryTrackingEnabledForChannel(channel.Id) {
		c.Err = model.NewAppError("triggerDeliveryTracking", "api.data_spillage.delivery_tracking.not_enabled_for_channel", nil, "", http.StatusBadRequest)
		return
	}

	if _, appErr = c.App.CreateDeliveryTrackingContentReviewJob(c.AppContext, postId, channel.TeamId, userId); appErr != nil {
		c.Err = appErr
		return
	}

	auditRec.Success()
	if inFlight {
		w.WriteHeader(http.StatusAccepted)
	} else {
		w.WriteHeader(http.StatusCreated)
	}
	ReturnStatusOK(w)
}

func checkPostTypeFlaggable(c *Context, post *model.Post) {
	if post.Type == model.PostTypeBurnOnRead || strings.HasPrefix(post.Type, model.PostSystemMessagePrefix) {
		c.Err = model.NewAppError("checkPostTypeFlaggable", "api.data_spillage.error.invalid_post_type", map[string]any{"PostType": post.Type}, "", http.StatusBadRequest)
	}
}

func generateDeliveryTrackingReceipt(c *Context, w http.ResponseWriter, r *http.Request) {
	if c.Err != nil {
		return
	}

	requireDeliveryTrackingEnabled(c)
	if c.Err != nil {
		return
	}

	c.RequirePostId()
	if c.Err != nil {
		return
	}

	postId := c.Params.PostId
	userId := c.AppContext.Session().UserId

	auditRec := c.MakeAuditRecord(model.AuditEventGenerateDeliveryTrackingReceipt, model.AuditStatusFail)
	defer c.LogAuditRecWithLevel(auditRec, app.LevelContent)
	model.AddEventParameterToAuditRec(auditRec, "postId", postId)
	model.AddEventParameterToAuditRec(auditRec, "userId", userId)

	post, appErr := c.App.GetSinglePost(c.AppContext, postId, true)
	if appErr != nil {
		c.Err = appErr
		return
	}

	channel, appErr := c.App.GetChannel(c.AppContext, post.ChannelId)
	if appErr != nil {
		c.Err = appErr
		return
	}

	requireTeamContentReviewer(c, userId, channel.TeamId)
	if c.Err != nil {
		return
	}

	if channel.IsGroupOrDirect() {
		c.Err = model.NewAppError("generateDeliveryTrackingReceipt", "api.data_spillage.delivery_tracking.dm_gm_not_supported", nil, "", http.StatusBadRequest)
		return
	}

	requirePostUnderReview(c, postId)
	if c.Err != nil {
		return
	}

	// Unlike the trigger endpoint, this does not re-check the channel's per-channel
	// setting, so already-generated data can always be read back.
	dataReady, appErr := c.App.DeliveryTrackingContentReviewJobExists(c.AppContext, postId, model.JobStatusSuccess)
	if appErr != nil {
		c.Err = appErr
		return
	}
	if !dataReady {
		c.Err = model.NewAppError("generateDeliveryTrackingReceipt", "api.data_spillage.delivery_tracking.receipt.not_generated", nil, "", http.StatusNotFound)
		return
	}

	reportPath, appErr := c.App.GenerateDeliveryTrackingReceipt(c.AppContext, postId, userId)
	if appErr != nil {
		c.Err = appErr
		return
	}
	defer func() {
		if err := os.Remove(reportPath); err != nil && !os.IsNotExist(err) {
			c.Logger.Warn("Failed to remove delivery tracking receipt temp file", mlog.String("path", reportPath), mlog.Err(err))
		}
	}()

	f, err := os.Open(reportPath)
	if err != nil {
		c.Err = model.NewAppError("generateDeliveryTrackingReceipt", "api.data_spillage.delivery_tracking.receipt.open.app_error", nil, "", http.StatusInternalServerError).Wrap(err)
		return
	}
	defer f.Close()

	stat, err := f.Stat()
	if err != nil {
		c.Err = model.NewAppError("generateDeliveryTrackingReceipt", "api.data_spillage.delivery_tracking.receipt.stat.app_error", nil, "", http.StatusInternalServerError).Wrap(err)
		return
	}

	filename := fmt.Sprintf("delivery-receipt-%s-%d.csv", postId, model.GetMillis())
	w.Header().Set("Content-Type", "text/csv; charset=utf-8")
	w.Header().Set("Content-Disposition", fmt.Sprintf(`attachment; filename="%s"`, filename))
	http.ServeContent(w, r, filename, stat.ModTime(), f)

	auditRec.Success()
}
