// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

package app

import (
	"encoding/csv"
	"net/http"
	"os"
	"slices"
	"strconv"
	"strings"
	"time"

	"github.com/mattermost/mattermost/server/public/model"
	"github.com/mattermost/mattermost/server/public/shared/i18n"
	"github.com/mattermost/mattermost/server/public/shared/mlog"
	"github.com/mattermost/mattermost/server/public/shared/request"
	"github.com/mattermost/mattermost/server/v8/channels/store"
)

// deliveryReceiptPageSize bounds both the store page and the resolve buffer, so a
// hot post with hundreds of thousands of recipients uses bounded memory.
const deliveryReceiptPageSize = 2000

const deliveryReceiptTempPattern = "mm-delivery-receipt-*.csv"

// deliveryReceiptRecord is one aggregated recipient: every mechanism a single
// (target_id, target_type) received the post through, plus the earliest delivery
// time across those mechanisms.
type deliveryReceiptRecord struct {
	TargetID   string
	TargetType string
	Mechanisms []int16
	// Sources are the distinct post IDs whose delivery surfaced the reviewed post's
	// content to this recipient: the reviewed post itself (rendered "Direct") and/or
	// posts that permalink-preview it (rendered "Preview in <id>").
	Sources          []string
	FirstDeliveredAt int64
}

// deliveryReceiptAggregator collapses delivery rows — which arrive ordered by
// (target_id, target_type, mechanism), so every row for a recipient is
// contiguous — into one deliveryReceiptRecord per recipient, emitted in order.
// It is fed incrementally (per store page) and carries a pending recipient across
// page boundaries, so a recipient whose rows straddle two pages is emitted once.
type deliveryReceiptAggregator struct {
	pending *deliveryReceiptRecord
	emit    func(deliveryReceiptRecord) error
}

func (agg *deliveryReceiptAggregator) add(row model.UserPostDeliveryContentReview) error {
	if agg.pending != nil && (agg.pending.TargetID != row.TargetID || agg.pending.TargetType != row.TargetType) {
		if err := agg.flush(); err != nil {
			return err
		}
	}
	if agg.pending == nil {
		agg.pending = &deliveryReceiptRecord{
			TargetID:         row.TargetID,
			TargetType:       row.TargetType,
			FirstDeliveredAt: row.CreatedAt,
		}
	}
	if !slices.Contains(agg.pending.Mechanisms, row.Mechanism) {
		agg.pending.Mechanisms = append(agg.pending.Mechanisms, row.Mechanism)
	}
	if !slices.Contains(agg.pending.Sources, row.PostID) {
		agg.pending.Sources = append(agg.pending.Sources, row.PostID)
	}
	if row.CreatedAt < agg.pending.FirstDeliveredAt {
		agg.pending.FirstDeliveredAt = row.CreatedAt
	}
	return nil
}

func (agg *deliveryReceiptAggregator) flush() error {
	if agg.pending == nil {
		return nil
	}
	rec := *agg.pending
	agg.pending = nil
	return agg.emit(rec)
}

// deliveryMechanismLabel's T() calls pass string literals so the i18n extractor
// discovers the keys (a prefix+concatenation would be invisible to it).
func deliveryMechanismLabel(T i18n.TranslateFunc, mechanism int16) string {
	switch mechanism {
	case model.DeliveryMechanismProduct:
		return T("app.data_spillage.delivery_tracking.receipt.mechanism.product")
	case model.DeliveryMechanismEmail:
		return T("app.data_spillage.delivery_tracking.receipt.mechanism.email")
	case model.DeliveryMechanismPush:
		return T("app.data_spillage.delivery_tracking.receipt.mechanism.push")
	case model.DeliveryMechanismOutgoingWebhook:
		return T("app.data_spillage.delivery_tracking.receipt.mechanism.outgoing_webhook")
	case model.DeliveryMechanismPlugin:
		return T("app.data_spillage.delivery_tracking.receipt.mechanism.plugin")
	default:
		return T("app.data_spillage.delivery_tracking.receipt.mechanism.unknown")
	}
}

func deliveryTargetTypeLabel(T i18n.TranslateFunc, targetType string) string {
	switch targetType {
	case model.DeliveryTargetUser:
		return T("app.data_spillage.delivery_tracking.receipt.target_type.user")
	case model.DeliveryTargetPlugin:
		return T("app.data_spillage.delivery_tracking.receipt.target_type.plugin")
	case model.DeliveryTargetWebhook:
		return T("app.data_spillage.delivery_tracking.receipt.target_type.webhook")
	default:
		return T("app.data_spillage.delivery_tracking.receipt.target_type.unknown")
	}
}

// formatDeliverySources renders a recipient's source post IDs into human-readable
// labels: the reviewed post itself becomes "Direct", every other (previewing) post
// becomes "Preview in <id>". "Direct" sorts first; previews follow in ID order for
// deterministic output.
func formatDeliverySources(sources []string, reviewPostID string, T i18n.TranslateFunc) string {
	direct := false
	previews := make([]string, 0, len(sources))
	for _, src := range sources {
		if src == reviewPostID {
			direct = true
		} else {
			previews = append(previews, src)
		}
	}
	slices.Sort(previews)

	labels := make([]string, 0, len(sources))
	if direct {
		labels = append(labels, T("app.data_spillage.delivery_tracking.receipt.source.direct"))
	}
	for _, p := range previews {
		labels = append(labels, T("app.data_spillage.delivery_tracking.receipt.source.preview", map[string]any{"PostId": p}))
	}
	return strings.Join(labels, ", ")
}

// formatDeliveryReceiptRow renders a recipient as a CSV row. For a user target a
// nil user yields the "unknown/deleted" placeholder; plugin/webhook targets ignore
// user and show only their raw ID and type. reviewPostID is the post under review,
// used to label each source as a direct delivery or a preview.
func formatDeliveryReceiptRow(rec deliveryReceiptRecord, user *model.User, reviewPostID string, T i18n.TranslateFunc) []string {
	var username, email, fullName string
	if rec.TargetType == model.DeliveryTargetUser {
		if user != nil {
			username = user.Username
			email = user.Email
			fullName = strings.TrimSpace(user.GetFullName())
		} else {
			username = T("app.data_spillage.delivery_tracking.receipt.unknown_user")
		}
	}

	mechanisms := slices.Clone(rec.Mechanisms)
	slices.Sort(mechanisms)
	labels := make([]string, len(mechanisms))
	for i, mechanism := range mechanisms {
		labels[i] = deliveryMechanismLabel(T, mechanism)
	}

	return []string{
		deliveryTargetTypeLabel(T, rec.TargetType),
		rec.TargetID,
		username,
		email,
		fullName,
		strings.Join(labels, ", "),
		formatDeliverySources(rec.Sources, reviewPostID, T),
		time.UnixMilli(rec.FirstDeliveredAt).UTC().Format(time.RFC3339),
	}
}

// sanitizeCSVField neutralizes a value a spreadsheet application (Excel, Google
// Sheets, LibreOffice) could interpret as a formula. A field beginning with one
// of these characters is prefixed with a single quote so it renders as literal
// text, preventing CSV formula injection when the receipt is opened in a
// spreadsheet. See https://owasp.org/www-community/attacks/CSV_Injection
func sanitizeCSVField(value string) string {
	if value == "" {
		return value
	}
	switch value[0] {
	case '=', '+', '-', '@', '\t', '\r':
		return "'" + value
	}
	return value
}

// writeDeliveryReceiptRecord writes a CSV record after sanitizing every field, so
// no user-controlled value (usernames, emails, full names, display names, ...)
// can smuggle a formula into the generated receipt. It mutates record in place;
// every caller passes a freshly built slice.
func writeDeliveryReceiptRecord(w *csv.Writer, record []string) error {
	for i := range record {
		record[i] = sanitizeCSVField(record[i])
	}
	return w.Write(record)
}

// GenerateDeliveryTrackingReceipt writes a CSV receipt of a flagged post's
// recipients to a temp file and returns its path; the caller must remove the file
// after serving. Rows are streamed and aggregated to one per recipient, so memory
// stays bounded regardless of recipient count.
func (a *App) GenerateDeliveryTrackingReceipt(rctx request.CTX, postID, generatedByUserID string) (string, *model.AppError) {
	newAppError := func(id string, cause error) *model.AppError {
		return model.NewAppError("GenerateDeliveryTrackingReceipt", id, nil, "", http.StatusInternalServerError).Wrap(cause)
	}

	post, appErr := a.GetSinglePost(rctx, postID, true)
	if appErr != nil {
		return "", appErr
	}
	channel, appErr := a.GetChannel(rctx, post.ChannelId)
	if appErr != nil {
		return "", appErr
	}

	teamName := ""
	if channel.TeamId != "" {
		team, teamErr := a.GetTeam(channel.TeamId)
		if teamErr != nil {
			return "", teamErr
		}
		teamName = team.DisplayName
	}

	generatedByUsername := generatedByUserID
	locale := ""
	if u, uErr := a.GetUser(generatedByUserID); uErr == nil {
		generatedByUsername = u.Username
		locale = u.Locale
	}
	T := i18n.GetUserTranslations(locale)

	total, countErr := a.Srv().Store().UserPostDeliveryContentReview().CountByReviewPost(rctx.Context(), postID)
	if countErr != nil {
		return "", newAppError("app.data_spillage.delivery_tracking.receipt.read.app_error", countErr)
	}

	tmp, ferr := os.CreateTemp("", deliveryReceiptTempPattern)
	if ferr != nil {
		return "", newAppError("app.data_spillage.delivery_tracking.receipt.tempfile.app_error", ferr)
	}
	tmpPath := tmp.Name()
	cleanup := func() {
		_ = tmp.Close()
		_ = os.Remove(tmpPath)
	}

	csvWriter := csv.NewWriter(tmp)

	// csv.Writer allows variable field counts on write, so the 1-/2-column metadata
	// rows and the 7-column table can share one file.
	_ = writeDeliveryReceiptRecord(csvWriter, []string{T("app.data_spillage.delivery_tracking.receipt.title")})
	_ = writeDeliveryReceiptRecord(csvWriter, []string{T("app.data_spillage.delivery_tracking.receipt.meta.post_id"), postID})
	_ = writeDeliveryReceiptRecord(csvWriter, []string{T("app.data_spillage.delivery_tracking.receipt.meta.channel"), channel.DisplayName})
	_ = writeDeliveryReceiptRecord(csvWriter, []string{T("app.data_spillage.delivery_tracking.receipt.meta.team"), teamName})
	_ = writeDeliveryReceiptRecord(csvWriter, []string{T("app.data_spillage.delivery_tracking.receipt.meta.generated_by"), generatedByUsername})
	_ = writeDeliveryReceiptRecord(csvWriter, []string{T("app.data_spillage.delivery_tracking.receipt.meta.generated_at"), time.UnixMilli(model.GetMillis()).UTC().Format(time.RFC3339)})
	_ = writeDeliveryReceiptRecord(csvWriter, []string{T("app.data_spillage.delivery_tracking.receipt.meta.total_records"), strconv.FormatInt(total, 10)})
	_ = writeDeliveryReceiptRecord(csvWriter, []string{""})
	_ = writeDeliveryReceiptRecord(csvWriter, []string{
		T("app.data_spillage.delivery_tracking.receipt.column.type"),
		T("app.data_spillage.delivery_tracking.receipt.column.target_id"),
		T("app.data_spillage.delivery_tracking.receipt.column.username"),
		T("app.data_spillage.delivery_tracking.receipt.column.email"),
		T("app.data_spillage.delivery_tracking.receipt.column.full_name"),
		T("app.data_spillage.delivery_tracking.receipt.column.mechanisms"),
		T("app.data_spillage.delivery_tracking.receipt.column.sources"),
		T("app.data_spillage.delivery_tracking.receipt.column.first_delivered_at"),
	})

	// Buffer emitted records so users resolve in one query per page rather than one
	// per recipient, while keeping memory bounded.
	buffer := make([]deliveryReceiptRecord, 0, deliveryReceiptPageSize)
	flushBuffer := func() error {
		if len(buffer) == 0 {
			return nil
		}
		users := a.resolveDeliveryReceiptUsers(rctx, buffer)
		for _, rec := range buffer {
			if werr := writeDeliveryReceiptRecord(csvWriter, formatDeliveryReceiptRow(rec, users[rec.TargetID], postID, T)); werr != nil {
				return werr
			}
		}
		buffer = buffer[:0]
		return nil
	}

	agg := &deliveryReceiptAggregator{emit: func(rec deliveryReceiptRecord) error {
		buffer = append(buffer, rec)
		if len(buffer) >= deliveryReceiptPageSize {
			return flushBuffer()
		}
		return nil
	}}

	var cursor model.UserPostDeliveryReviewCursor
	for {
		batch, berr := a.Srv().Store().UserPostDeliveryContentReview().GetByReviewPost(rctx.Context(), postID, cursor, deliveryReceiptPageSize)
		if berr != nil {
			cleanup()
			return "", newAppError("app.data_spillage.delivery_tracking.receipt.read.app_error", berr)
		}
		if len(batch) == 0 {
			break
		}
		for _, row := range batch {
			if aerr := agg.add(row); aerr != nil {
				cleanup()
				return "", newAppError("app.data_spillage.delivery_tracking.receipt.write.app_error", aerr)
			}
		}
		last := batch[len(batch)-1]
		cursor = model.UserPostDeliveryReviewCursor{TargetID: last.TargetID, TargetType: last.TargetType, PostID: last.PostID, Mechanism: last.Mechanism}
		if len(batch) < deliveryReceiptPageSize {
			break
		}
	}
	if aerr := agg.flush(); aerr != nil {
		cleanup()
		return "", newAppError("app.data_spillage.delivery_tracking.receipt.write.app_error", aerr)
	}
	if berr := flushBuffer(); berr != nil {
		cleanup()
		return "", newAppError("app.data_spillage.delivery_tracking.receipt.write.app_error", berr)
	}

	csvWriter.Flush()
	if werr := csvWriter.Error(); werr != nil {
		cleanup()
		return "", newAppError("app.data_spillage.delivery_tracking.receipt.write.app_error", werr)
	}
	if serr := tmp.Sync(); serr != nil {
		cleanup()
		return "", newAppError("app.data_spillage.delivery_tracking.receipt.sync.app_error", serr)
	}
	if cerr := tmp.Close(); cerr != nil {
		_ = os.Remove(tmpPath)
		return "", newAppError("app.data_spillage.delivery_tracking.receipt.close.app_error", cerr)
	}

	return tmpPath, nil
}

// resolveDeliveryReceiptUsers resolves the user-type targets to a map keyed by
// user ID (plugin/webhook targets are skipped). On error it logs and returns nil,
// so rows fall back to the placeholder rather than failing the whole report.
func (a *App) resolveDeliveryReceiptUsers(rctx request.CTX, records []deliveryReceiptRecord) map[string]*model.User {
	ids := make([]string, 0, len(records))
	for _, rec := range records {
		if rec.TargetType == model.DeliveryTargetUser {
			ids = append(ids, rec.TargetID)
		}
	}
	if len(ids) == 0 {
		return nil
	}

	users, appErr := a.GetUsersByIds(rctx, ids, &store.UserGetByIdsOpts{})
	if appErr != nil {
		rctx.Logger().Warn("Failed to resolve users for delivery receipt; affected rows use placeholders", mlog.Err(appErr))
		return nil
	}

	byID := make(map[string]*model.User, len(users))
	for _, u := range users {
		byID[u.Id] = u
	}
	return byID
}
