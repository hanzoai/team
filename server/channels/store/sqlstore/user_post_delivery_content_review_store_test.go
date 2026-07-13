// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

package sqlstore

import (
	"context"
	"testing"

	"github.com/stretchr/testify/require"

	"github.com/mattermost/mattermost/server/public/model"
	"github.com/mattermost/mattermost/server/public/shared/mlog"
	"github.com/mattermost/mattermost/server/v8/channels/store"
	"github.com/mattermost/mattermost/server/v8/channels/store/storetest"
)

// newDeliveryTrackingTestStore builds a SqlStore with post delivery tracking
// enabled on the primary-DB fallback (DataSource=""), so the real source store
// and the content-review store are both available.
func newDeliveryTrackingTestStore(t *testing.T) (*SqlStore, func()) {
	t.Helper()

	logger := mlog.CreateTestLogger(t)

	settings, err := makeSqlSettings(model.DatabaseDriverPostgres)
	if err != nil {
		t.Skip(err)
	}

	deliverySettings := model.DeliveryTrackingSettings{
		Enable:     model.NewPointer(true),
		DataSource: model.NewPointer(""), // primary-DB fallback
	}
	deliverySettings.SetDefaults()

	ss, err := New(*settings, logger, nil, WithDeliveryTrackingSettings(deliverySettings),
		WithFeatureFlags(func() *model.FeatureFlags { return &model.FeatureFlags{PostDeliveryTracking: true} }))
	require.NoError(t, err)

	return ss, func() {
		ss.Close()
		storetest.CleanupSqlSettings(settings)
	}
}

func TestUserPostDeliveryContentReviewStore(t *testing.T) {
	if testing.Short() {
		t.Skip("requires live database")
	}

	ss, cleanup := newDeliveryTrackingTestStore(t)
	defer cleanup()

	ctx := context.Background()
	contentReviewStore := ss.UserPostDeliveryContentReview()

	readRows := func(t *testing.T, postID string) []model.UserPostDeliveryContentReview {
		t.Helper()
		var rows []model.UserPostDeliveryContentReview
		require.NoError(t, ss.GetMaster().SelectContext(ctx, &rows,
			`SELECT post_id, target_id, target_type, mechanism, created_at, copied_at, job_id
			 FROM `+userPostDeliveryContentReviewTableName+`
			 WHERE post_id = $1 ORDER BY target_id`, postID))
		return rows
	}

	t.Run("SaveBatch preserves source created_at and stamps copied_at/job_id", func(t *testing.T) {
		postID := model.NewId()
		jobID := model.NewId()
		const delivered = int64(1234567890)

		before := model.GetMillis()
		require.NoError(t, contentReviewStore.SaveBatch(ctx, []model.UserPostDelivery{
			{PostID: postID, TargetID: model.NewId(), TargetType: model.DeliveryTargetUser, Mechanism: model.DeliveryMechanismProduct, CreatedAt: delivered},
		}, jobID))

		rows := readRows(t, postID)
		require.Len(t, rows, 1)
		require.Equal(t, delivered, rows[0].CreatedAt, "the original delivery time must be preserved")
		require.Equal(t, jobID, rows[0].JobID)
		require.GreaterOrEqual(t, rows[0].CopiedAt, before, "copied_at is stamped at copy time")
	})

	t.Run("SaveBatch dedups in-batch and across calls, keeping the first row", func(t *testing.T) {
		postID := model.NewId()
		target := model.NewId()
		records := []model.UserPostDelivery{
			{PostID: postID, TargetID: target, TargetType: model.DeliveryTargetUser, Mechanism: model.DeliveryMechanismProduct, CreatedAt: 111},
			{PostID: postID, TargetID: target, TargetType: model.DeliveryTargetUser, Mechanism: model.DeliveryMechanismProduct, CreatedAt: 222}, // duplicate key
		}
		require.NoError(t, contentReviewStore.SaveBatch(ctx, records, model.NewId()))
		// A re-copy (e.g. a later re-trigger) must be a no-op.
		require.NoError(t, contentReviewStore.SaveBatch(ctx, records, model.NewId()))

		rows := readRows(t, postID)
		require.Len(t, rows, 1)
		require.Equal(t, int64(111), rows[0].CreatedAt, "ON CONFLICT DO NOTHING keeps the first-copied row")
	})

	t.Run("same target/post but different mechanism are distinct rows", func(t *testing.T) {
		postID := model.NewId()
		target := model.NewId()
		require.NoError(t, contentReviewStore.SaveBatch(ctx, []model.UserPostDelivery{
			{PostID: postID, TargetID: target, TargetType: model.DeliveryTargetUser, Mechanism: model.DeliveryMechanismProduct, CreatedAt: 1},
			{PostID: postID, TargetID: target, TargetType: model.DeliveryTargetUser, Mechanism: model.DeliveryMechanismEmail, CreatedAt: 2},
		}, model.NewId()))
		require.Len(t, readRows(t, postID), 2)
	})

	t.Run("CountByPost", func(t *testing.T) {
		postID := model.NewId()
		require.NoError(t, contentReviewStore.SaveBatch(ctx, []model.UserPostDelivery{
			{PostID: postID, TargetID: model.NewId(), TargetType: model.DeliveryTargetUser, Mechanism: model.DeliveryMechanismProduct, CreatedAt: 1},
			{PostID: postID, TargetID: model.NewId(), TargetType: model.DeliveryTargetUser, Mechanism: model.DeliveryMechanismEmail, CreatedAt: 2},
		}, model.NewId()))

		n, err := contentReviewStore.CountByPost(ctx, postID)
		require.NoError(t, err)
		require.Equal(t, int64(2), n)

		empty, err := contentReviewStore.CountByPost(ctx, model.NewId())
		require.NoError(t, err)
		require.Equal(t, int64(0), empty)
	})

	t.Run("DeleteByPost scopes to the given post", func(t *testing.T) {
		post1, post2 := model.NewId(), model.NewId()
		require.NoError(t, contentReviewStore.SaveBatch(ctx, []model.UserPostDelivery{
			{PostID: post1, TargetID: model.NewId(), TargetType: model.DeliveryTargetUser, Mechanism: model.DeliveryMechanismProduct, CreatedAt: 1},
		}, model.NewId()))
		require.NoError(t, contentReviewStore.SaveBatch(ctx, []model.UserPostDelivery{
			{PostID: post2, TargetID: model.NewId(), TargetType: model.DeliveryTargetUser, Mechanism: model.DeliveryMechanismProduct, CreatedAt: 1},
		}, model.NewId()))

		require.NoError(t, contentReviewStore.DeleteByPost(ctx, post1))

		count1, err := contentReviewStore.CountByPost(ctx, post1)
		require.NoError(t, err)
		require.Equal(t, int64(0), count1)
		count2, err := contentReviewStore.CountByPost(ctx, post2)
		require.NoError(t, err)
		require.Equal(t, int64(1), count2, "other posts are untouched")
	})
}

func TestUserPostDeliveryStoreGetByPost(t *testing.T) {
	if testing.Short() {
		t.Skip("requires live database")
	}

	ss, cleanup := newDeliveryTrackingTestStore(t)
	defer cleanup()

	ctx := context.Background()
	deliveryStore := ss.UserPostDelivery()

	postID := model.NewId()
	const total = 5
	records := make([]model.UserPostDelivery, 0, total)
	for range total {
		records = append(records, model.UserPostDelivery{PostID: postID, TargetID: model.NewId(), TargetType: model.DeliveryTargetUser, Mechanism: model.DeliveryMechanismProduct})
	}
	require.NoError(t, deliveryStore.MarkBulk(ctx, records))
	// A different post's rows must never leak into the page.
	require.NoError(t, deliveryStore.MarkBulk(ctx, []model.UserPostDelivery{
		{PostID: model.NewId(), TargetID: model.NewId(), TargetType: model.DeliveryTargetUser, Mechanism: model.DeliveryMechanismProduct},
	}))

	var got []model.UserPostDelivery
	seen := map[model.UserPostDeliveryCursor]bool{}
	var cursor model.UserPostDeliveryCursor
	for {
		batch, err := deliveryStore.GetByPost(ctx, postID, cursor, 2)
		require.NoError(t, err)
		if len(batch) == 0 {
			break
		}
		for _, row := range batch {
			require.Equal(t, postID, row.PostID)
			key := model.UserPostDeliveryCursor{TargetID: row.TargetID, TargetType: row.TargetType, Mechanism: row.Mechanism}
			require.False(t, seen[key], "row returned on more than one page")
			seen[key] = true
		}
		got = append(got, batch...)
		last := batch[len(batch)-1]
		cursor = model.UserPostDeliveryCursor{TargetID: last.TargetID, TargetType: last.TargetType, Mechanism: last.Mechanism}
		if len(batch) < 2 {
			break
		}
	}

	require.Len(t, got, total, "keyset paging returns every row exactly once")
	for i := 1; i < len(got); i++ {
		require.Less(t, got[i-1].TargetID, got[i].TargetID, "rows come back in ascending target order")
	}
}

func TestUserPostDeliveryContentReviewStoreGetByPost(t *testing.T) {
	if testing.Short() {
		t.Skip("requires live database")
	}

	ss, cleanup := newDeliveryTrackingTestStore(t)
	defer cleanup()

	ctx := context.Background()
	contentReviewStore := ss.UserPostDeliveryContentReview()

	postID := model.NewId()
	// targetA is delivered via two mechanisms, so a recipient spans multiple rows.
	targetA, targetB, targetC := model.NewId(), model.NewId(), model.NewId()
	records := []model.UserPostDelivery{
		{PostID: postID, TargetID: targetA, TargetType: model.DeliveryTargetUser, Mechanism: model.DeliveryMechanismProduct, CreatedAt: 10},
		{PostID: postID, TargetID: targetA, TargetType: model.DeliveryTargetUser, Mechanism: model.DeliveryMechanismEmail, CreatedAt: 20},
		{PostID: postID, TargetID: targetB, TargetType: model.DeliveryTargetUser, Mechanism: model.DeliveryMechanismProduct, CreatedAt: 30},
		{PostID: postID, TargetID: targetC, TargetType: model.DeliveryTargetPlugin, Mechanism: model.DeliveryMechanismPlugin, CreatedAt: 40},
	}
	require.NoError(t, contentReviewStore.SaveBatch(ctx, records, model.NewId()))
	// A different post's rows must never leak into the page.
	require.NoError(t, contentReviewStore.SaveBatch(ctx, []model.UserPostDelivery{
		{PostID: model.NewId(), TargetID: model.NewId(), TargetType: model.DeliveryTargetUser, Mechanism: model.DeliveryMechanismProduct, CreatedAt: 1},
	}, model.NewId()))

	var got []model.UserPostDeliveryContentReview
	seen := map[model.UserPostDeliveryCursor]bool{}
	var cursor model.UserPostDeliveryCursor
	for {
		batch, err := contentReviewStore.GetByPost(ctx, postID, cursor, 2)
		require.NoError(t, err)
		if len(batch) == 0 {
			break
		}
		for _, row := range batch {
			require.Equal(t, postID, row.PostID)
			key := model.UserPostDeliveryCursor{TargetID: row.TargetID, TargetType: row.TargetType, Mechanism: row.Mechanism}
			require.False(t, seen[key], "row returned on more than one page")
			seen[key] = true
		}
		got = append(got, batch...)
		last := batch[len(batch)-1]
		cursor = model.UserPostDeliveryCursor{TargetID: last.TargetID, TargetType: last.TargetType, Mechanism: last.Mechanism}
		if len(batch) < 2 {
			break
		}
	}

	require.Len(t, got, len(records), "keyset paging returns every row exactly once")
	for i := 1; i < len(got); i++ {
		prev, cur := got[i-1], got[i]
		require.LessOrEqual(t, prev.TargetID, cur.TargetID, "rows come back in ascending target order")
		if prev.TargetID == cur.TargetID && prev.TargetType == cur.TargetType {
			require.Less(t, prev.Mechanism, cur.Mechanism, "a recipient's rows are ordered by mechanism and stay contiguous")
		}
	}

	empty, err := contentReviewStore.GetByPost(ctx, model.NewId(), model.UserPostDeliveryCursor{}, 10)
	require.NoError(t, err)
	require.Empty(t, empty)
}

func TestUserPostDeliveryFeatureDisabled(t *testing.T) {
	if testing.Short() {
		t.Skip("requires live database")
	}

	logger := mlog.CreateTestLogger(t)

	settings, err := makeSqlSettings(model.DatabaseDriverPostgres)
	if err != nil {
		t.Skip(err)
	}

	// No delivery-tracking settings/flag: the source pool is never created, so the
	// source store is the no-op. The primary migrations (incl. the content-review
	// table) still run.
	ss, err := New(*settings, logger, nil)
	require.NoError(t, err)
	defer func() {
		ss.Close()
		storetest.CleanupSqlSettings(settings)
	}()

	ctx := context.Background()

	t.Run("source GetByPost returns the sentinel when the feature is disabled", func(t *testing.T) {
		_, err := ss.UserPostDelivery().GetByPost(ctx, model.NewId(), model.UserPostDeliveryCursor{}, 10)
		require.ErrorIs(t, err, store.ErrUserPostDeliverySourceUnavailable)
	})

	t.Run("content-review store writes to primary independently of the source pool", func(t *testing.T) {
		postID := model.NewId()
		require.NoError(t, ss.UserPostDeliveryContentReview().SaveBatch(ctx, []model.UserPostDelivery{
			{PostID: postID, TargetID: model.NewId(), TargetType: model.DeliveryTargetUser, Mechanism: model.DeliveryMechanismProduct, CreatedAt: 42},
		}, model.NewId()))

		n, err := ss.UserPostDeliveryContentReview().CountByPost(ctx, postID)
		require.NoError(t, err)
		require.Equal(t, int64(1), n)
	})
}
