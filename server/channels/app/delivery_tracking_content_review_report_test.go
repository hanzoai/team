// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

package app

import (
	"bytes"
	"encoding/csv"
	"testing"

	"github.com/stretchr/testify/require"

	"github.com/mattermost/mattermost/server/public/model"
	"github.com/mattermost/mattermost/server/public/shared/i18n"
)

// identityT returns each translation ID verbatim, so tests assert on stable i18n
// keys without depending on loaded translation bundles.
var identityT i18n.TranslateFunc = func(id string, args ...any) string { return id }

func TestDeliveryReceiptAggregator(t *testing.T) {
	row := func(target, targetType, postID string, mechanism int16, createdAt int64) model.UserPostDeliveryContentReview {
		return model.UserPostDeliveryContentReview{PostID: postID, TargetID: target, TargetType: targetType, Mechanism: mechanism, CreatedAt: createdAt}
	}

	// Rows are contiguous by (target_id, target_type), as GetByReviewPost returns them.
	// Recipient A saw the reviewed post directly (REV) and through a previewing post (PREV).
	rows := []model.UserPostDeliveryContentReview{
		row("A", model.DeliveryTargetUser, "REV", model.DeliveryMechanismProduct, 30),
		row("A", model.DeliveryTargetUser, "REV", model.DeliveryMechanismEmail, 10),
		row("A", model.DeliveryTargetUser, "PREV", model.DeliveryMechanismProduct, 5), // via preview, earliest time
		row("B", model.DeliveryTargetUser, "REV", model.DeliveryMechanismProduct, 20),
		row("C", model.DeliveryTargetPlugin, "PREV", model.DeliveryMechanismPlugin, 40),
	}

	var got []deliveryReceiptRecord
	agg := &deliveryReceiptAggregator{emit: func(rec deliveryReceiptRecord) error {
		got = append(got, rec)
		return nil
	}}

	// Feed the rows in two chunks that split recipient A across the boundary, to
	// exercise the pending accumulator carrying over between store pages.
	for _, r := range rows[:1] {
		require.NoError(t, agg.add(r))
	}
	for _, r := range rows[1:] {
		require.NoError(t, agg.add(r))
	}
	require.NoError(t, agg.flush())

	require.Len(t, got, 3)

	require.Equal(t, "A", got[0].TargetID)
	require.Equal(t, model.DeliveryTargetUser, got[0].TargetType)
	require.Equal(t, []int16{model.DeliveryMechanismProduct, model.DeliveryMechanismEmail}, got[0].Mechanisms, "mechanisms deduped, insertion order preserved")
	require.Equal(t, []string{"REV", "PREV"}, got[0].Sources, "distinct source posts, insertion order preserved")
	require.Equal(t, int64(5), got[0].FirstDeliveredAt, "earliest delivery time across all rows and sources")

	require.Equal(t, "B", got[1].TargetID)
	require.Equal(t, []int16{model.DeliveryMechanismProduct}, got[1].Mechanisms)
	require.Equal(t, []string{"REV"}, got[1].Sources)
	require.Equal(t, int64(20), got[1].FirstDeliveredAt)

	require.Equal(t, "C", got[2].TargetID)
	require.Equal(t, model.DeliveryTargetPlugin, got[2].TargetType)
	require.Equal(t, []int16{model.DeliveryMechanismPlugin}, got[2].Mechanisms)
	require.Equal(t, []string{"PREV"}, got[2].Sources)
	require.Equal(t, int64(40), got[2].FirstDeliveredAt)
}

func TestDeliveryReceiptAggregatorEmpty(t *testing.T) {
	emitted := false
	agg := &deliveryReceiptAggregator{emit: func(deliveryReceiptRecord) error { emitted = true; return nil }}
	require.NoError(t, agg.flush())
	require.False(t, emitted, "flushing with nothing pending emits nothing")
}

func TestFormatDeliverySources(t *testing.T) {
	const reviewPostID = "REV"

	t.Run("direct only", func(t *testing.T) {
		require.Equal(t, "app.data_spillage.delivery_tracking.receipt.source.direct",
			formatDeliverySources([]string{reviewPostID}, reviewPostID, identityT))
	})

	t.Run("preview only", func(t *testing.T) {
		// identityT ignores args, so both preview entries render to the same key; the
		// point is that no "direct" label appears and both previews are listed.
		require.Equal(t,
			"app.data_spillage.delivery_tracking.receipt.source.preview, app.data_spillage.delivery_tracking.receipt.source.preview",
			formatDeliverySources([]string{"B2", "B1"}, reviewPostID, identityT))
	})

	t.Run("direct sorts before previews regardless of input order", func(t *testing.T) {
		require.Equal(t,
			"app.data_spillage.delivery_tracking.receipt.source.direct, app.data_spillage.delivery_tracking.receipt.source.preview",
			formatDeliverySources([]string{"B1", reviewPostID}, reviewPostID, identityT))
	})

	t.Run("no sources yields empty", func(t *testing.T) {
		require.Empty(t, formatDeliverySources(nil, reviewPostID, identityT))
	})
}

func TestFormatDeliveryReceiptRow(t *testing.T) {
	// 1704067200000ms == 2024-01-01T00:00:00Z.
	const deliveredMs = int64(1704067200000)
	const reviewPostID = "REV"

	t.Run("resolved user with direct and preview sources", func(t *testing.T) {
		rec := deliveryReceiptRecord{
			TargetID:         "user-id",
			TargetType:       model.DeliveryTargetUser,
			Mechanisms:       []int16{model.DeliveryMechanismEmail, model.DeliveryMechanismProduct}, // out of order
			Sources:          []string{reviewPostID, "PREV"},
			FirstDeliveredAt: deliveredMs,
		}
		user := &model.User{Id: "user-id", Username: "alice", Email: "alice@example.com", FirstName: "Alice", LastName: "Adams"}

		row := formatDeliveryReceiptRow(rec, user, reviewPostID, identityT)

		require.Equal(t, []string{
			"app.data_spillage.delivery_tracking.receipt.target_type.user",
			"user-id",
			"alice",
			"alice@example.com",
			"Alice Adams",
			"app.data_spillage.delivery_tracking.receipt.mechanism.product, app.data_spillage.delivery_tracking.receipt.mechanism.email",
			"app.data_spillage.delivery_tracking.receipt.source.direct, app.data_spillage.delivery_tracking.receipt.source.preview",
			"2024-01-01T00:00:00Z",
		}, row)
	})

	t.Run("unresolved user uses placeholder", func(t *testing.T) {
		rec := deliveryReceiptRecord{TargetID: "gone", TargetType: model.DeliveryTargetUser, Mechanisms: []int16{model.DeliveryMechanismPush}, Sources: []string{reviewPostID}, FirstDeliveredAt: deliveredMs}

		row := formatDeliveryReceiptRow(rec, nil, reviewPostID, identityT)

		require.Equal(t, "app.data_spillage.delivery_tracking.receipt.unknown_user", row[2])
		require.Empty(t, row[3])
		require.Empty(t, row[4])
	})

	t.Run("plugin target shows raw id and type, no user fields", func(t *testing.T) {
		rec := deliveryReceiptRecord{TargetID: "com.example.plugin", TargetType: model.DeliveryTargetPlugin, Mechanisms: []int16{model.DeliveryMechanismPlugin}, Sources: []string{reviewPostID}, FirstDeliveredAt: deliveredMs}

		row := formatDeliveryReceiptRow(rec, nil, reviewPostID, identityT)

		require.Equal(t, "app.data_spillage.delivery_tracking.receipt.target_type.plugin", row[0])
		require.Equal(t, "com.example.plugin", row[1])
		require.Empty(t, row[2])
		require.Empty(t, row[3])
		require.Empty(t, row[4])
		require.Equal(t, "app.data_spillage.delivery_tracking.receipt.mechanism.plugin", row[5])
	})
}

func TestSanitizeCSVField(t *testing.T) {
	t.Run("prefixes values that begin with a formula trigger", func(t *testing.T) {
		for _, in := range []string{"=1+1", "+1", "-1", "@SUM(A1)", "\tvalue", "\rvalue", "=cmd|'/c calc'!A1"} {
			require.Equal(t, "'"+in, sanitizeCSVField(in), "input %q", in)
		}
	})

	t.Run("leaves safe values untouched", func(t *testing.T) {
		// Empty, plain text, and values where a trigger char is not leading.
		for _, in := range []string{"", "alice", "alice@example.com", "Alice Adams", "2024-01-01T00:00:00Z", "user-id", "a=b", "1+1"} {
			require.Equal(t, in, sanitizeCSVField(in), "input %q", in)
		}
	})
}

func TestWriteDeliveryReceiptRecord(t *testing.T) {
	// A recipient whose user fields each begin with a distinct formula trigger.
	rec := deliveryReceiptRecord{
		TargetID:         "user-id",
		TargetType:       model.DeliveryTargetUser,
		Mechanisms:       []int16{model.DeliveryMechanismEmail},
		FirstDeliveredAt: 1704067200000, // 2024-01-01T00:00:00Z
	}
	user := &model.User{Id: "user-id", Username: "=cmd|'/c calc'!A1", Email: "+attacker@evil.com", FirstName: "-Bob", LastName: ""}

	var buf bytes.Buffer
	w := csv.NewWriter(&buf)
	require.NoError(t, writeDeliveryReceiptRecord(w, formatDeliveryReceiptRow(rec, user, "review-post", identityT)))
	w.Flush()
	require.NoError(t, w.Error())

	parsed, err := csv.NewReader(&buf).ReadAll()
	require.NoError(t, err)
	require.Len(t, parsed, 1)
	row := parsed[0]

	// Every user-controlled field that begins with a formula trigger is neutralized
	// with a leading single quote, so opening the receipt in a spreadsheet is safe.
	require.Equal(t, "'=cmd|'/c calc'!A1", row[2], "username")
	require.Equal(t, "'+attacker@evil.com", row[3], "email")
	require.Equal(t, "'-Bob", row[4], "full name")
	// Non-user-controlled fields are unaffected.
	require.Equal(t, "user-id", row[1], "target id")
	require.Empty(t, row[6], "sources (none set on this record)")
	require.Equal(t, "2024-01-01T00:00:00Z", row[7], "delivered at")
}
