// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

package sqlstore

import (
	"context"

	"github.com/lib/pq"
	"github.com/pkg/errors"

	"github.com/mattermost/mattermost/server/public/model"
	"github.com/mattermost/mattermost/server/v8/channels/store"
)

const userPostDeliveryTableName = "UserPostDelivery"

// SqlUserPostDeliveryStore reads and writes post-delivery rows on the delivery
// pool: a dedicated second Postgres DB when configured, otherwise the primary
// pool (fallback).
type SqlUserPostDeliveryStore struct {
	*SqlStore
}

// noopUserPostDeliveryStore is returned when the feature is disabled, so callers
// never have to nil-check the store.
type noopUserPostDeliveryStore struct{}

func (noopUserPostDeliveryStore) MarkBulk(context.Context, []model.UserPostDelivery) error {
	return nil
}

func (noopUserPostDeliveryStore) DeleteByPost(context.Context, string) error {
	return nil
}

func (noopUserPostDeliveryStore) GetByPost(context.Context, string, model.UserPostDeliveryCursor, int) ([]model.UserPostDelivery, error) {
	// The feature is disabled (no source pool). Signal loudly rather than
	// returning an empty result so callers don't mistake it for "no deliveries".
	return nil, store.ErrUserPostDeliverySourceUnavailable
}

func newSqlUserPostDeliveryStore(s *SqlStore) store.UserPostDeliveryStore {
	if s.userPostDeliveryX == nil {
		return noopUserPostDeliveryStore{}
	}
	return &SqlUserPostDeliveryStore{SqlStore: s}
}

// MarkBulk inserts the records in a single round-trip, zipping the columns with
// unnest and dropping duplicates via ON CONFLICT DO NOTHING.
func (s *SqlUserPostDeliveryStore) MarkBulk(ctx context.Context, records []model.UserPostDelivery) error {
	if len(records) == 0 {
		return nil
	}

	postIDs := make([]string, len(records))
	targetIDs := make([]string, len(records))
	targetTypes := make([]string, len(records))
	// pq.Array supports []int64; the SQL casts it to smallint[] for storage.
	mechanisms := make([]int64, len(records))
	for i, record := range records {
		postIDs[i] = record.PostID
		targetIDs[i] = record.TargetID
		targetTypes[i] = record.TargetType
		mechanisms[i] = int64(record.Mechanism)
	}

	res, err := s.userPostDeliveryX.ExecContext(ctx,
		`INSERT INTO `+userPostDeliveryTableName+` (post_id, target_id, target_type, mechanism, created_at)
		 SELECT p, t, ty, m, $5
		 FROM unnest($1::text[], $2::text[], $3::text[], $4::smallint[]) AS u(p, t, ty, m)
		 ON CONFLICT (post_id, target_id, target_type, mechanism) DO NOTHING`,
		pq.Array(postIDs), pq.Array(targetIDs), pq.Array(targetTypes), pq.Array(mechanisms), model.GetMillis())
	if err != nil {
		return errors.Wrap(err, "SqlUserPostDeliveryStore.MarkBulk: failed to insert delivery records")
	}

	if s.metrics != nil {
		if n, raErr := res.RowsAffected(); raErr == nil && n > 0 {
			s.metrics.IncrementUserPostDeliveryRecordsPersisted(int(n))
		}
	}
	return nil
}

// DeleteByPost removes all delivery rows for a post.
func (s *SqlUserPostDeliveryStore) DeleteByPost(ctx context.Context, postID string) error {
	if _, err := s.userPostDeliveryX.ExecContext(ctx,
		`DELETE FROM `+userPostDeliveryTableName+` WHERE post_id = $1`, postID); err != nil {
		return errors.Wrapf(err, "SqlUserPostDeliveryStore.DeleteByPost: failed to delete delivery records for post_id=%s", postID)
	}
	return nil
}

// GetByPost returns up to limit delivery rows for postID, keyset-paginated by the
// (target_id, target_type, mechanism) columns of the unique index. The first page
// passes the zero cursor; subsequent pages pass the last returned row's key.
func (s *SqlUserPostDeliveryStore) GetByPost(ctx context.Context, postID string, after model.UserPostDeliveryCursor, limit int) ([]model.UserPostDelivery, error) {
	records := []model.UserPostDelivery{}
	var err error
	if after.IsFirstPage() {
		err = s.userPostDeliveryX.SelectContext(ctx, &records,
			`SELECT post_id, target_id, target_type, mechanism, created_at
			 FROM `+userPostDeliveryTableName+`
			 WHERE post_id = $1
			 ORDER BY target_id, target_type, mechanism
			 LIMIT $2`, postID, limit)
	} else {
		// Row-value comparison is index-friendly in Postgres and matches the
		// ORDER BY, so the unique index drives the scan.
		err = s.userPostDeliveryX.SelectContext(ctx, &records,
			`SELECT post_id, target_id, target_type, mechanism, created_at
			 FROM `+userPostDeliveryTableName+`
			 WHERE post_id = $1
			   AND (target_id, target_type, mechanism) > ($2, $3, $4)
			 ORDER BY target_id, target_type, mechanism
			 LIMIT $5`, postID, after.TargetID, after.TargetType, after.Mechanism, limit)
	}
	if err != nil {
		return nil, errors.Wrapf(err, "SqlUserPostDeliveryStore.GetByPost: failed to fetch delivery records for post_id=%s", postID)
	}
	return records, nil
}
