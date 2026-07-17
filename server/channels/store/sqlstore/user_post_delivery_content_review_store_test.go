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

	readRows := func(t *testing.T, reviewPostID string) []model.UserPostDeliveryContentReview {
		t.Helper()
		var rows []model.UserPostDeliveryContentReview
		require.NoError(t, ss.GetMaster().SelectContext(ctx, &rows,
			`SELECT review_post_id, post_id, target_id, target_type, mechanism, created_at, copied_at, job_id
			 FROM `+userPostDeliveryContentReviewTableName+`
			 WHERE review_post_id = $1 ORDER BY target_id, post_id`, reviewPostID))
		return rows
	}

	t.Run("SaveBatch stamps review_post_id, preserves source created_at, and copied_at/job_id", func(t *testing.T) {
		reviewPostID := model.NewId()
		jobID := model.NewId()
		const delivered = int64(1234567890)

		before := model.GetMillis()
		require.NoError(t, contentReviewStore.SaveBatch(ctx, reviewPostID, []model.UserPostDelivery{
			{PostID: reviewPostID, TargetID: model.NewId(), TargetType: model.DeliveryTargetUser, Mechanism: model.DeliveryMechanismProduct, CreatedAt: delivered},
		}, jobID))

		rows := readRows(t, reviewPostID)
		require.Len(t, rows, 1)
		require.Equal(t, reviewPostID, rows[0].ReviewPostID)
		require.Equal(t, reviewPostID, rows[0].PostID, "a direct delivery keeps the reviewed post as its post_id")
		require.Equal(t, delivered, rows[0].CreatedAt, "the original delivery time must be preserved")
		require.Equal(t, jobID, rows[0].JobID)
		require.GreaterOrEqual(t, rows[0].CopiedAt, before, "copied_at is stamped at copy time")
	})

	t.Run("SaveBatch dedups within a review but isolates across reviews", func(t *testing.T) {
		reviewPostID := model.NewId()
		target := model.NewId()
		records := []model.UserPostDelivery{
			{PostID: reviewPostID, TargetID: target, TargetType: model.DeliveryTargetUser, Mechanism: model.DeliveryMechanismProduct, CreatedAt: 111},
			{PostID: reviewPostID, TargetID: target, TargetType: model.DeliveryTargetUser, Mechanism: model.DeliveryMechanismProduct, CreatedAt: 222}, // duplicate key
		}
		require.NoError(t, contentReviewStore.SaveBatch(ctx, reviewPostID, records, model.NewId()))
		// A re-copy (e.g. a later re-trigger) must be a no-op.
		require.NoError(t, contentReviewStore.SaveBatch(ctx, reviewPostID, records, model.NewId()))

		rows := readRows(t, reviewPostID)
		require.Len(t, rows, 1)
		require.Equal(t, int64(111), rows[0].CreatedAt, "ON CONFLICT DO NOTHING keeps the first-copied row")

		// The same delivered row copied for a DIFFERENT review is a separate row: reviews
		// are isolated by review_post_id (a previewing post can belong to several reviews).
		otherReview := model.NewId()
		require.NoError(t, contentReviewStore.SaveBatch(ctx, otherReview, records, model.NewId()))
		require.Len(t, readRows(t, otherReview), 1)
		require.Len(t, readRows(t, reviewPostID), 1, "the first review is unaffected")
	})

	t.Run("same target/post but different mechanism are distinct rows", func(t *testing.T) {
		reviewPostID := model.NewId()
		target := model.NewId()
		require.NoError(t, contentReviewStore.SaveBatch(ctx, reviewPostID, []model.UserPostDelivery{
			{PostID: reviewPostID, TargetID: target, TargetType: model.DeliveryTargetUser, Mechanism: model.DeliveryMechanismProduct, CreatedAt: 1},
			{PostID: reviewPostID, TargetID: target, TargetType: model.DeliveryTargetUser, Mechanism: model.DeliveryMechanismEmail, CreatedAt: 2},
		}, model.NewId()))
		require.Len(t, readRows(t, reviewPostID), 2)
	})

	t.Run("direct and via-preview deliveries coexist under one review", func(t *testing.T) {
		reviewPostID := model.NewId()
		previewerID := model.NewId()
		target := model.NewId()
		require.NoError(t, contentReviewStore.SaveBatch(ctx, reviewPostID, []model.UserPostDelivery{
			{PostID: reviewPostID, TargetID: target, TargetType: model.DeliveryTargetUser, Mechanism: model.DeliveryMechanismProduct, CreatedAt: 10}, // direct
			{PostID: previewerID, TargetID: target, TargetType: model.DeliveryTargetUser, Mechanism: model.DeliveryMechanismProduct, CreatedAt: 20},  // via a previewing post
		}, model.NewId()))

		rows := readRows(t, reviewPostID)
		require.Len(t, rows, 2, "the same recipient under two source posts are distinct rows (provenance preserved)")
		require.ElementsMatch(t, []string{reviewPostID, previewerID}, []string{rows[0].PostID, rows[1].PostID})
	})

	t.Run("CountByReviewPost", func(t *testing.T) {
		reviewPostID := model.NewId()
		require.NoError(t, contentReviewStore.SaveBatch(ctx, reviewPostID, []model.UserPostDelivery{
			{PostID: reviewPostID, TargetID: model.NewId(), TargetType: model.DeliveryTargetUser, Mechanism: model.DeliveryMechanismProduct, CreatedAt: 1},
			{PostID: model.NewId(), TargetID: model.NewId(), TargetType: model.DeliveryTargetUser, Mechanism: model.DeliveryMechanismEmail, CreatedAt: 2},
		}, model.NewId()))

		n, err := contentReviewStore.CountByReviewPost(ctx, reviewPostID)
		require.NoError(t, err)
		require.Equal(t, int64(2), n, "counts every row for the review, direct and via-preview")

		empty, err := contentReviewStore.CountByReviewPost(ctx, model.NewId())
		require.NoError(t, err)
		require.Equal(t, int64(0), empty)
	})

	t.Run("DeleteByReviewPost scopes to the given review", func(t *testing.T) {
		review1, review2 := model.NewId(), model.NewId()
		require.NoError(t, contentReviewStore.SaveBatch(ctx, review1, []model.UserPostDelivery{
			{PostID: review1, TargetID: model.NewId(), TargetType: model.DeliveryTargetUser, Mechanism: model.DeliveryMechanismProduct, CreatedAt: 1},
		}, model.NewId()))
		require.NoError(t, contentReviewStore.SaveBatch(ctx, review2, []model.UserPostDelivery{
			{PostID: review2, TargetID: model.NewId(), TargetType: model.DeliveryTargetUser, Mechanism: model.DeliveryMechanismProduct, CreatedAt: 1},
		}, model.NewId()))

		require.NoError(t, contentReviewStore.DeleteByReviewPost(ctx, review1))

		count1, err := contentReviewStore.CountByReviewPost(ctx, review1)
		require.NoError(t, err)
		require.Equal(t, int64(0), count1)
		count2, err := contentReviewStore.CountByReviewPost(ctx, review2)
		require.NoError(t, err)
		require.Equal(t, int64(1), count2, "other reviews are untouched")
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

func TestUserPostDeliveryContentReviewStoreGetByReviewPost(t *testing.T) {
	if testing.Short() {
		t.Skip("requires live database")
	}

	ss, cleanup := newDeliveryTrackingTestStore(t)
	defer cleanup()

	ctx := context.Background()
	contentReviewStore := ss.UserPostDeliveryContentReview()

	reviewPostID := model.NewId()
	previewerID := model.NewId()
	// targetA is delivered the reviewed post directly (two mechanisms) AND through a
	// previewing post, so a recipient spans multiple post_ids and mechanisms.
	targetA, targetB, targetC := model.NewId(), model.NewId(), model.NewId()
	records := []model.UserPostDelivery{
		{PostID: reviewPostID, TargetID: targetA, TargetType: model.DeliveryTargetUser, Mechanism: model.DeliveryMechanismProduct, CreatedAt: 10},
		{PostID: reviewPostID, TargetID: targetA, TargetType: model.DeliveryTargetUser, Mechanism: model.DeliveryMechanismEmail, CreatedAt: 20},
		{PostID: previewerID, TargetID: targetA, TargetType: model.DeliveryTargetUser, Mechanism: model.DeliveryMechanismProduct, CreatedAt: 15},
		{PostID: reviewPostID, TargetID: targetB, TargetType: model.DeliveryTargetUser, Mechanism: model.DeliveryMechanismProduct, CreatedAt: 30},
		{PostID: previewerID, TargetID: targetC, TargetType: model.DeliveryTargetPlugin, Mechanism: model.DeliveryMechanismPlugin, CreatedAt: 40},
	}
	require.NoError(t, contentReviewStore.SaveBatch(ctx, reviewPostID, records, model.NewId()))
	// A different review's rows must never leak into the page.
	require.NoError(t, contentReviewStore.SaveBatch(ctx, model.NewId(), []model.UserPostDelivery{
		{PostID: model.NewId(), TargetID: model.NewId(), TargetType: model.DeliveryTargetUser, Mechanism: model.DeliveryMechanismProduct, CreatedAt: 1},
	}, model.NewId()))

	var got []model.UserPostDeliveryContentReview
	seen := map[model.UserPostDeliveryReviewCursor]bool{}
	var cursor model.UserPostDeliveryReviewCursor
	for {
		batch, err := contentReviewStore.GetByReviewPost(ctx, reviewPostID, cursor, 2)
		require.NoError(t, err)
		if len(batch) == 0 {
			break
		}
		for _, row := range batch {
			require.Equal(t, reviewPostID, row.ReviewPostID)
			key := model.UserPostDeliveryReviewCursor{TargetID: row.TargetID, TargetType: row.TargetType, PostID: row.PostID, Mechanism: row.Mechanism}
			require.False(t, seen[key], "row returned on more than one page")
			seen[key] = true
		}
		got = append(got, batch...)
		last := batch[len(batch)-1]
		cursor = model.UserPostDeliveryReviewCursor{TargetID: last.TargetID, TargetType: last.TargetType, PostID: last.PostID, Mechanism: last.Mechanism}
		if len(batch) < 2 {
			break
		}
	}

	require.Len(t, got, len(records), "keyset paging returns every row exactly once")
	for i := 1; i < len(got); i++ {
		prev, cur := got[i-1], got[i]
		require.LessOrEqual(t, prev.TargetID, cur.TargetID, "rows come back in ascending target order")
		if prev.TargetID == cur.TargetID && prev.TargetType == cur.TargetType {
			// Within a recipient, rows are ordered by (post_id, mechanism) and stay
			// contiguous, so the receipt aggregator can collapse them in one pass while
			// still seeing each source post for provenance.
			require.True(t,
				prev.PostID < cur.PostID || (prev.PostID == cur.PostID && prev.Mechanism < cur.Mechanism),
				"a recipient's rows are ordered by (post_id, mechanism)")
		}
	}

	empty, err := contentReviewStore.GetByReviewPost(ctx, model.NewId(), model.UserPostDeliveryReviewCursor{}, 10)
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
		reviewPostID := model.NewId()
		require.NoError(t, ss.UserPostDeliveryContentReview().SaveBatch(ctx, reviewPostID, []model.UserPostDelivery{
			{PostID: reviewPostID, TargetID: model.NewId(), TargetType: model.DeliveryTargetUser, Mechanism: model.DeliveryMechanismProduct, CreatedAt: 42},
		}, model.NewId()))

		n, err := ss.UserPostDeliveryContentReview().CountByReviewPost(ctx, reviewPostID)
		require.NoError(t, err)
		require.Equal(t, int64(1), n)
	})
}
