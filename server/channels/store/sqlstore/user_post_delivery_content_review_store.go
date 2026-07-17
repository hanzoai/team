// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

package sqlstore

import (
	"context"

	"github.com/lib/pq"
	sq "github.com/mattermost/squirrel"
	"github.com/pkg/errors"

	"github.com/mattermost/mattermost/server/public/model"
	"github.com/mattermost/mattermost/server/v8/channels/store"
)

const userPostDeliveryContentReviewTableName = "UserPostDeliveryContentReview"

// SqlUserPostDeliveryContentReviewStore is the primary-DB copy of delivery rows
// for posts under content review. Unlike the source UserPostDelivery store it is
// never a no-op and always writes to the primary pool (masterX): the
// content-review table exists on the primary DB regardless of where the source
// table lives, and the feature gate is enforced at the job layer.
type SqlUserPostDeliveryContentReviewStore struct {
	*SqlStore
}

func newSqlUserPostDeliveryContentReviewStore(s *SqlStore) store.UserPostDeliveryContentReviewStore {
	return &SqlUserPostDeliveryContentReviewStore{SqlStore: s}
}

// SaveBatch inserts source rows into the review of reviewPostID in a single
// round-trip, zipping the per-row columns with unnest and applying the same
// review_post_id/copied_at/job_id to the whole batch. Each row keeps its own
// post_id (the post actually delivered — reviewPostID itself or a post that
// previews it) and its original created_at (the delivery time). Duplicates within
// a review are dropped via ON CONFLICT DO NOTHING; the same delivered row can still
// exist under a different review_post_id.
func (s *SqlUserPostDeliveryContentReviewStore) SaveBatch(ctx context.Context, reviewPostID string, records []model.UserPostDelivery, jobID string) error {
	if len(records) == 0 {
		return nil
	}

	postIDs := make([]string, len(records))
	targetIDs := make([]string, len(records))
	targetTypes := make([]string, len(records))
	// pq.Array supports []int64; the SQL casts these to smallint[]/bigint[].
	mechanisms := make([]int64, len(records))
	createdAts := make([]int64, len(records))
	for i, record := range records {
		postIDs[i] = record.PostID
		targetIDs[i] = record.TargetID
		targetTypes[i] = record.TargetType
		mechanisms[i] = int64(record.Mechanism)
		createdAts[i] = record.CreatedAt
	}

	if _, err := s.GetMaster().ExecContext(ctx,
		`INSERT INTO `+userPostDeliveryContentReviewTableName+` (review_post_id, post_id, target_id, target_type, mechanism, created_at, copied_at, job_id)
		 SELECT $6, post_id, target_id, target_type, mechanism, created_at, $7, $8
		 FROM unnest($1::text[], $2::text[], $3::text[], $4::smallint[], $5::bigint[]) AS u(post_id, target_id, target_type, mechanism, created_at)
		 ON CONFLICT (review_post_id, post_id, target_id, target_type, mechanism) DO NOTHING`,
		pq.Array(postIDs), pq.Array(targetIDs), pq.Array(targetTypes), pq.Array(mechanisms), pq.Array(createdAts),
		reviewPostID, model.GetMillis(), jobID); err != nil {
		return errors.Wrap(err, "SqlUserPostDeliveryContentReviewStore.SaveBatch: failed to insert content-review records")
	}

	return nil
}

func (s *SqlUserPostDeliveryContentReviewStore) DeleteByReviewPost(ctx context.Context, reviewPostID string) error {
	query, args, err := s.getQueryBuilder().
		Delete(userPostDeliveryContentReviewTableName).
		Where(sq.Eq{"review_post_id": reviewPostID}).
		ToSql()
	if err != nil {
		return errors.Wrapf(err, "SqlUserPostDeliveryContentReviewStore.DeleteByReviewPost: failed to build query for review_post_id=%s", reviewPostID)
	}

	if _, err := s.GetMaster().ExecContext(ctx, query, args...); err != nil {
		return errors.Wrapf(err, "SqlUserPostDeliveryContentReviewStore.DeleteByReviewPost: failed to delete content-review records for review_post_id=%s", reviewPostID)
	}
	return nil
}

func (s *SqlUserPostDeliveryContentReviewStore) CountByReviewPost(ctx context.Context, reviewPostID string) (int64, error) {
	query, args, err := s.getQueryBuilder().
		Select("COUNT(*)").
		From(userPostDeliveryContentReviewTableName).
		Where(sq.Eq{"review_post_id": reviewPostID}).
		ToSql()
	if err != nil {
		return 0, errors.Wrapf(err, "SqlUserPostDeliveryContentReviewStore.CountByReviewPost: failed to build query for review_post_id=%s", reviewPostID)
	}

	var count int64
	if err := s.GetMaster().QueryRowContext(ctx, query, args...).Scan(&count); err != nil {
		return 0, errors.Wrapf(err, "SqlUserPostDeliveryContentReviewStore.CountByReviewPost: failed to count content-review records for review_post_id=%s", reviewPostID)
	}
	return count, nil
}

// GetByReviewPost pages one review's rows ordered by (target_id, target_type,
// post_id, mechanism). Leading with (target_id, target_type) keeps every row for a
// recipient contiguous even when they were delivered the post through several
// previewing posts, so the receipt aggregator can collapse them in one pass while
// still seeing each source post_id for provenance.
func (s *SqlUserPostDeliveryContentReviewStore) GetByReviewPost(ctx context.Context, reviewPostID string, after model.UserPostDeliveryReviewCursor, limit int) ([]model.UserPostDeliveryContentReview, error) {
	query := s.getQueryBuilder().
		Select("review_post_id", "post_id", "target_id", "target_type", "mechanism", "created_at", "copied_at", "job_id").
		From(userPostDeliveryContentReviewTableName).
		Where(sq.Eq{"review_post_id": reviewPostID}).
		OrderBy("target_id", "target_type", "post_id", "mechanism").
		Limit(uint64(limit))

	if !after.IsFirstPage() {
		query = query.Where(sq.Expr("(target_id, target_type, post_id, mechanism) > (?, ?, ?, ?)",
			after.TargetID, after.TargetType, after.PostID, after.Mechanism))
	}

	records := []model.UserPostDeliveryContentReview{}
	if err := s.GetMaster().SelectBuilderCtx(ctx, &records, query); err != nil {
		return nil, errors.Wrapf(err, "SqlUserPostDeliveryContentReviewStore.GetByReviewPost: failed to fetch content-review records for review_post_id=%s", reviewPostID)
	}
	return records, nil
}
