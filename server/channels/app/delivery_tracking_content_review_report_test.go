// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

package app

import (
	"testing"

	"github.com/stretchr/testify/require"

	"github.com/mattermost/mattermost/server/public/model"
	"github.com/mattermost/mattermost/server/public/shared/i18n"
)

// identityT returns each translation ID verbatim, so tests assert on stable i18n
// keys without depending on loaded translation bundles.
var identityT i18n.TranslateFunc = func(id string, args ...any) string { return id }

func TestDeliveryReceiptAggregator(t *testing.T) {
	row := func(target, targetType string, mechanism int16, createdAt int64) model.UserPostDeliveryContentReview {
		return model.UserPostDeliveryContentReview{TargetID: target, TargetType: targetType, Mechanism: mechanism, CreatedAt: createdAt}
	}

	// Rows are contiguous by (target_id, target_type), as GetByPost returns them.
	rows := []model.UserPostDeliveryContentReview{
		row("A", model.DeliveryTargetUser, model.DeliveryMechanismProduct, 30),
		row("A", model.DeliveryTargetUser, model.DeliveryMechanismEmail, 10),
		row("A", model.DeliveryTargetUser, model.DeliveryMechanismProduct, 5), // duplicate mechanism, earlier time
		row("B", model.DeliveryTargetUser, model.DeliveryMechanismProduct, 20),
		row("C", model.DeliveryTargetPlugin, model.DeliveryMechanismPlugin, 40),
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
	require.Equal(t, int64(5), got[0].FirstDeliveredAt, "earliest delivery time across all rows")

	require.Equal(t, "B", got[1].TargetID)
	require.Equal(t, []int16{model.DeliveryMechanismProduct}, got[1].Mechanisms)
	require.Equal(t, int64(20), got[1].FirstDeliveredAt)

	require.Equal(t, "C", got[2].TargetID)
	require.Equal(t, model.DeliveryTargetPlugin, got[2].TargetType)
	require.Equal(t, []int16{model.DeliveryMechanismPlugin}, got[2].Mechanisms)
	require.Equal(t, int64(40), got[2].FirstDeliveredAt)
}

func TestDeliveryReceiptAggregatorEmpty(t *testing.T) {
	emitted := false
	agg := &deliveryReceiptAggregator{emit: func(deliveryReceiptRecord) error { emitted = true; return nil }}
	require.NoError(t, agg.flush())
	require.False(t, emitted, "flushing with nothing pending emits nothing")
}

func TestFormatDeliveryReceiptRow(t *testing.T) {
	// 1704067200000ms == 2024-01-01T00:00:00Z.
	const deliveredMs = int64(1704067200000)

	t.Run("resolved user, mechanisms sorted and joined", func(t *testing.T) {
		rec := deliveryReceiptRecord{
			TargetID:         "user-id",
			TargetType:       model.DeliveryTargetUser,
			Mechanisms:       []int16{model.DeliveryMechanismEmail, model.DeliveryMechanismProduct}, // out of order
			FirstDeliveredAt: deliveredMs,
		}
		user := &model.User{Id: "user-id", Username: "alice", Email: "alice@example.com", FirstName: "Alice", LastName: "Adams"}

		row := formatDeliveryReceiptRow(rec, user, identityT)

		require.Equal(t, []string{
			"app.data_spillage.delivery_tracking.receipt.target_type.user",
			"user-id",
			"alice",
			"alice@example.com",
			"Alice Adams",
			"app.data_spillage.delivery_tracking.receipt.mechanism.product, app.data_spillage.delivery_tracking.receipt.mechanism.email",
			"2024-01-01T00:00:00Z",
		}, row)
	})

	t.Run("unresolved user uses placeholder", func(t *testing.T) {
		rec := deliveryReceiptRecord{TargetID: "gone", TargetType: model.DeliveryTargetUser, Mechanisms: []int16{model.DeliveryMechanismPush}, FirstDeliveredAt: deliveredMs}

		row := formatDeliveryReceiptRow(rec, nil, identityT)

		require.Equal(t, "app.data_spillage.delivery_tracking.receipt.unknown_user", row[2])
		require.Empty(t, row[3])
		require.Empty(t, row[4])
	})

	t.Run("plugin target shows raw id and type, no user fields", func(t *testing.T) {
		rec := deliveryReceiptRecord{TargetID: "com.example.plugin", TargetType: model.DeliveryTargetPlugin, Mechanisms: []int16{model.DeliveryMechanismPlugin}, FirstDeliveredAt: deliveredMs}

		row := formatDeliveryReceiptRow(rec, nil, identityT)

		require.Equal(t, "app.data_spillage.delivery_tracking.receipt.target_type.plugin", row[0])
		require.Equal(t, "com.example.plugin", row[1])
		require.Empty(t, row[2])
		require.Empty(t, row[3])
		require.Empty(t, row[4])
		require.Equal(t, "app.data_spillage.delivery_tracking.receipt.mechanism.plugin", row[5])
	})
}
