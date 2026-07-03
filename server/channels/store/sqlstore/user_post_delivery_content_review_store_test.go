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

	dt := model.DeliveryTrackingSettings{
		Enable:     model.NewPointer(true),
		DataSource: model.NewPointer(""), // primary-DB fallback
	}
	dt.SetDefaults()

	ss, err := New(*settings, logger, nil, WithDeliveryTrackingSettings(dt),
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
	crs := ss.UserPostDeliveryContentReview()

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
		require.NoError(t, crs.SaveBatch(ctx, []model.UserPostDelivery{
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
		recs := []model.UserPostDelivery{
			{PostID: postID, TargetID: target, TargetType: model.DeliveryTargetUser, Mechanism: model.DeliveryMechanismProduct, CreatedAt: 111},
			{PostID: postID, TargetID: target, TargetType: model.DeliveryTargetUser, Mechanism: model.DeliveryMechanismProduct, CreatedAt: 222}, // duplicate key
		}
		require.NoError(t, crs.SaveBatch(ctx, recs, model.NewId()))
		// A re-copy (e.g. a later re-trigger) must be a no-op.
		require.NoError(t, crs.SaveBatch(ctx, recs, model.NewId()))

		rows := readRows(t, postID)
		require.Len(t, rows, 1)
		require.Equal(t, int64(111), rows[0].CreatedAt, "ON CONFLICT DO NOTHING keeps the first-copied row")
	})

	t.Run("same target/post but different mechanism are distinct rows", func(t *testing.T) {
		postID := model.NewId()
		target := model.NewId()
		require.NoError(t, crs.SaveBatch(ctx, []model.UserPostDelivery{
			{PostID: postID, TargetID: target, TargetType: model.DeliveryTargetUser, Mechanism: model.DeliveryMechanismProduct, CreatedAt: 1},
			{PostID: postID, TargetID: target, TargetType: model.DeliveryTargetUser, Mechanism: model.DeliveryMechanismEmail, CreatedAt: 2},
		}, model.NewId()))
		require.Len(t, readRows(t, postID), 2)
	})

	t.Run("CountByPost", func(t *testing.T) {
		postID := model.NewId()
		require.NoError(t, crs.SaveBatch(ctx, []model.UserPostDelivery{
			{PostID: postID, TargetID: model.NewId(), TargetType: model.DeliveryTargetUser, Mechanism: model.DeliveryMechanismProduct, CreatedAt: 1},
			{PostID: postID, TargetID: model.NewId(), TargetType: model.DeliveryTargetUser, Mechanism: model.DeliveryMechanismEmail, CreatedAt: 2},
		}, model.NewId()))

		n, err := crs.CountByPost(ctx, postID)
		require.NoError(t, err)
		require.Equal(t, int64(2), n)

		empty, err := crs.CountByPost(ctx, model.NewId())
		require.NoError(t, err)
		require.Equal(t, int64(0), empty)
	})

	t.Run("DeleteByPost scopes to the given post", func(t *testing.T) {
		p1, p2 := model.NewId(), model.NewId()
		require.NoError(t, crs.SaveBatch(ctx, []model.UserPostDelivery{
			{PostID: p1, TargetID: model.NewId(), TargetType: model.DeliveryTargetUser, Mechanism: model.DeliveryMechanismProduct, CreatedAt: 1},
		}, model.NewId()))
		require.NoError(t, crs.SaveBatch(ctx, []model.UserPostDelivery{
			{PostID: p2, TargetID: model.NewId(), TargetType: model.DeliveryTargetUser, Mechanism: model.DeliveryMechanismProduct, CreatedAt: 1},
		}, model.NewId()))

		require.NoError(t, crs.DeleteByPost(ctx, p1))

		n1, err := crs.CountByPost(ctx, p1)
		require.NoError(t, err)
		require.Equal(t, int64(0), n1)
		n2, err := crs.CountByPost(ctx, p2)
		require.NoError(t, err)
		require.Equal(t, int64(1), n2, "other posts are untouched")
	})

	t.Run("SaveBatch with no records is a no-op", func(t *testing.T) {
		require.NoError(t, crs.SaveBatch(ctx, nil, model.NewId()))
	})
}

func TestUserPostDeliveryStoreGetByPost(t *testing.T) {
	if testing.Short() {
		t.Skip("requires live database")
	}

	ss, cleanup := newDeliveryTrackingTestStore(t)
	defer cleanup()

	ctx := context.Background()
	s := ss.UserPostDelivery()

	postID := model.NewId()
	const total = 5
	recs := make([]model.UserPostDelivery, 0, total)
	for range total {
		recs = append(recs, model.UserPostDelivery{PostID: postID, TargetID: model.NewId(), TargetType: model.DeliveryTargetUser, Mechanism: model.DeliveryMechanismProduct})
	}
	require.NoError(t, s.MarkBulk(ctx, recs))
	// A different post's rows must never leak into the page.
	require.NoError(t, s.MarkBulk(ctx, []model.UserPostDelivery{
		{PostID: model.NewId(), TargetID: model.NewId(), TargetType: model.DeliveryTargetUser, Mechanism: model.DeliveryMechanismProduct},
	}))

	var got []model.UserPostDelivery
	seen := map[model.UserPostDeliveryCursor]bool{}
	var cursor model.UserPostDeliveryCursor
	for {
		batch, err := s.GetByPost(ctx, postID, cursor, 2)
		require.NoError(t, err)
		if len(batch) == 0 {
			break
		}
		for _, r := range batch {
			require.Equal(t, postID, r.PostID)
			key := model.UserPostDeliveryCursor{TargetID: r.TargetID, TargetType: r.TargetType, Mechanism: r.Mechanism}
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
