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

// SaveBatch inserts source rows into the content-review table in a single
// round-trip, zipping the per-row columns with unnest and applying the same
// copied_at/job_id to the whole batch. Each row's original created_at (the
// delivery time) is preserved; duplicates are dropped via ON CONFLICT DO NOTHING.
func (s *SqlUserPostDeliveryContentReviewStore) SaveBatch(ctx context.Context, records []model.UserPostDelivery, jobID string) error {
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
		`INSERT INTO `+userPostDeliveryContentReviewTableName+` (post_id, target_id, target_type, mechanism, created_at, copied_at, job_id)
		 SELECT post_id, target_id, target_type, mechanism, created_at, $6, $7
		 FROM unnest($1::text[], $2::text[], $3::text[], $4::smallint[], $5::bigint[]) AS u(post_id, target_id, target_type, mechanism, created_at)
		 ON CONFLICT (post_id, target_id, target_type, mechanism) DO NOTHING`,
		pq.Array(postIDs), pq.Array(targetIDs), pq.Array(targetTypes), pq.Array(mechanisms), pq.Array(createdAts),
		model.GetMillis(), jobID); err != nil {
		return errors.Wrap(err, "SqlUserPostDeliveryContentReviewStore.SaveBatch: failed to insert content-review records")
	}

	return nil
}

func (s *SqlUserPostDeliveryContentReviewStore) DeleteByPost(ctx context.Context, postID string) error {
	query, args, err := s.getQueryBuilder().
		Delete(userPostDeliveryContentReviewTableName).
		Where(sq.Eq{"post_id": postID}).
		ToSql()
	if err != nil {
		return errors.Wrapf(err, "SqlUserPostDeliveryContentReviewStore.DeleteByPost: failed to build query for post_id=%s", postID)
	}

	if _, err := s.GetMaster().ExecContext(ctx, query, args...); err != nil {
		return errors.Wrapf(err, "SqlUserPostDeliveryContentReviewStore.DeleteByPost: failed to delete content-review records for post_id=%s", postID)
	}
	return nil
}

func (s *SqlUserPostDeliveryContentReviewStore) CountByPost(ctx context.Context, postID string) (int64, error) {
	query, args, err := s.getQueryBuilder().
		Select("COUNT(*)").
		From(userPostDeliveryContentReviewTableName).
		Where(sq.Eq{"post_id": postID}).
		ToSql()
	if err != nil {
		return 0, errors.Wrapf(err, "SqlUserPostDeliveryContentReviewStore.CountByPost: failed to build query for post_id=%s", postID)
	}

	var count int64
	if err := s.GetMaster().QueryRowContext(ctx, query, args...).Scan(&count); err != nil {
		return 0, errors.Wrapf(err, "SqlUserPostDeliveryContentReviewStore.CountByPost: failed to count content-review records for post_id=%s", postID)
	}
	return count, nil
}

func (s *SqlUserPostDeliveryContentReviewStore) GetByPost(ctx context.Context, postID string, after model.UserPostDeliveryCursor, limit int) ([]model.UserPostDeliveryContentReview, error) {
	query := s.getQueryBuilder().
		Select("post_id", "target_id", "target_type", "mechanism", "created_at", "copied_at", "job_id").
		From(userPostDeliveryContentReviewTableName).
		Where(sq.Eq{"post_id": postID}).
		OrderBy("target_id", "target_type", "mechanism").
		Limit(uint64(limit))

	if !after.IsFirstPage() {
		query = query.Where(sq.Expr("(target_id, target_type, mechanism) > (?, ?, ?)",
			after.TargetID, after.TargetType, after.Mechanism))
	}

	records := []model.UserPostDeliveryContentReview{}
	if err := s.GetMaster().SelectBuilderCtx(ctx, &records, query); err != nil {
		return nil, errors.Wrapf(err, "SqlUserPostDeliveryContentReviewStore.GetByPost: failed to fetch content-review records for post_id=%s", postID)
	}
	return records, nil
}
