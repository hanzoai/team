// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

package delivery_tracking_content_review

import (
	"context"
	"errors"
	"sort"
	"testing"

	"github.com/stretchr/testify/require"

	"github.com/mattermost/mattermost/server/public/model"
	"github.com/mattermost/mattermost/server/v8/channels/store"
)

func rowCursor(row model.UserPostDelivery) model.UserPostDeliveryCursor {
	return model.UserPostDeliveryCursor{TargetID: row.TargetID, TargetType: row.TargetType, Mechanism: row.Mechanism}
}

func cursorLess(a, b model.UserPostDeliveryCursor) bool {
	if a.TargetID != b.TargetID {
		return a.TargetID < b.TargetID
	}
	if a.TargetType != b.TargetType {
		return a.TargetType < b.TargetType
	}
	return a.Mechanism < b.Mechanism
}

// fakeSource implements sourceReader with real keyset semantics over an
// in-memory, sorted set of rows, so the copy loop's cursor handling is
// exercised faithfully.
type fakeSource struct {
	rows       []model.UserPostDelivery
	err        error
	calls      int
	gotCursors []model.UserPostDeliveryCursor
}

func newFakeSource(rows []model.UserPostDelivery) *fakeSource {
	sorted := append([]model.UserPostDelivery(nil), rows...)
	sort.Slice(sorted, func(i, j int) bool {
		return cursorLess(rowCursor(sorted[i]), rowCursor(sorted[j]))
	})
	return &fakeSource{rows: sorted}
}

func (f *fakeSource) GetByPost(_ context.Context, postID string, after model.UserPostDeliveryCursor, limit int) ([]model.UserPostDelivery, error) {
	f.calls++
	f.gotCursors = append(f.gotCursors, after)
	if f.err != nil {
		return nil, f.err
	}
	out := []model.UserPostDelivery{}
	for _, row := range f.rows {
		if row.PostID != postID {
			continue
		}
		if after.IsFirstPage() || cursorLess(after, rowCursor(row)) {
			out = append(out, row)
			if len(out) == limit {
				break
			}
		}
	}
	return out, nil
}

// fakeTarget implements reviewWriter, recording every saved row and the jobID.
type fakeTarget struct {
	saved  []model.UserPostDelivery
	jobIDs []string
	err    error
	calls  int
}

func (f *fakeTarget) SaveBatch(_ context.Context, records []model.UserPostDelivery, jobID string) error {
	f.calls++
	if f.err != nil {
		return f.err
	}
	f.saved = append(f.saved, records...)
	f.jobIDs = append(f.jobIDs, jobID)
	return nil
}

func makeRows(postID string, n int) []model.UserPostDelivery {
	out := make([]model.UserPostDelivery, n)
	for i := range n {
		out[i] = model.UserPostDelivery{
			PostID:     postID,
			TargetID:   model.NewId(),
			TargetType: model.DeliveryTargetUser,
			Mechanism:  model.DeliveryMechanismProduct,
			CreatedAt:  int64(1000 + i),
		}
	}
	return out
}

func neverStop() bool { return false }

func TestCopyPostDeliveries(t *testing.T) {
	ctx := context.Background()
	const jobID = "job-abc"

	t.Run("post with zero deliveries copies nothing and succeeds", func(t *testing.T) {
		postID := model.NewId()
		source := newFakeSource(nil)
		target := &fakeTarget{}

		copied, canceled, err := copyPostDeliveries(ctx, source, target, postID, jobID, 2, neverStop, nil)
		require.NoError(t, err)
		require.False(t, canceled)
		require.Equal(t, 0, copied)
		require.Equal(t, 0, target.calls, "no SaveBatch calls for an empty post")
		require.Equal(t, 1, source.calls, "one read returns the empty page")
	})

	t.Run("multi-page copy returns every row exactly once", func(t *testing.T) {
		postID := model.NewId()
		rows := makeRows(postID, 5)
		source := newFakeSource(rows)
		target := &fakeTarget{}

		var progress []int
		onProgress := func(copied int) error { progress = append(progress, copied); return nil }

		copied, canceled, err := copyPostDeliveries(ctx, source, target, postID, jobID, 2, neverStop, onProgress)
		require.NoError(t, err)
		require.False(t, canceled)
		require.Equal(t, 5, copied)

		// All rows saved exactly once (dedup by key), and jobID threaded through.
		require.Len(t, target.saved, 5)
		seen := map[model.UserPostDeliveryCursor]bool{}
		for _, row := range target.saved {
			require.False(t, seen[rowCursor(row)], "row saved more than once")
			seen[rowCursor(row)] = true
		}
		for _, savedJobID := range target.jobIDs {
			require.Equal(t, jobID, savedJobID)
		}
		require.Equal(t, []int{2, 4, 5}, progress, "cumulative progress reported per batch")
	})

	t.Run("full final page triggers one more empty read", func(t *testing.T) {
		postID := model.NewId()
		source := newFakeSource(makeRows(postID, 4))
		target := &fakeTarget{}

		copied, _, err := copyPostDeliveries(ctx, source, target, postID, jobID, 2, neverStop, nil)
		require.NoError(t, err)
		require.Equal(t, 4, copied)
		require.Equal(t, 3, source.calls, "2 full pages + 1 empty page")
		require.Equal(t, 2, target.calls, "empty page is not saved")
	})

	t.Run("source unavailable surfaces the sentinel error", func(t *testing.T) {
		source := newFakeSource(nil)
		source.err = store.ErrUserPostDeliverySourceUnavailable
		target := &fakeTarget{}

		copied, canceled, err := copyPostDeliveries(ctx, source, target, model.NewId(), jobID, 2, neverStop, nil)
		require.ErrorIs(t, err, store.ErrUserPostDeliverySourceUnavailable)
		require.False(t, canceled)
		require.Equal(t, 0, copied)
		require.Equal(t, 0, target.calls)
	})

	t.Run("stop before first batch cancels immediately", func(t *testing.T) {
		postID := model.NewId()
		source := newFakeSource(makeRows(postID, 5))
		target := &fakeTarget{}

		copied, canceled, err := copyPostDeliveries(ctx, source, target, postID, jobID, 2, func() bool { return true }, nil)
		require.NoError(t, err)
		require.True(t, canceled)
		require.Equal(t, 0, copied)
		require.Equal(t, 0, source.calls, "no reads once stopped")
	})

	t.Run("stop between batches cancels with partial progress", func(t *testing.T) {
		postID := model.NewId()
		source := newFakeSource(makeRows(postID, 6))
		target := &fakeTarget{}

		calls := 0
		shouldStop := func() bool {
			calls++
			return calls > 1 // allow the first batch, stop before the second
		}

		copied, canceled, err := copyPostDeliveries(ctx, source, target, postID, jobID, 2, shouldStop, nil)
		require.NoError(t, err)
		require.True(t, canceled)
		require.Equal(t, 2, copied, "one batch copied before cancellation")
	})

	t.Run("SaveBatch error propagates and stops the copy", func(t *testing.T) {
		postID := model.NewId()
		source := newFakeSource(makeRows(postID, 4))
		wantErr := errors.New("write failed")
		target := &fakeTarget{err: wantErr}

		copied, canceled, err := copyPostDeliveries(ctx, source, target, postID, jobID, 2, neverStop, nil)
		require.ErrorIs(t, err, wantErr)
		require.False(t, canceled)
		require.Equal(t, 0, copied)
	})

	t.Run("onProgress error propagates", func(t *testing.T) {
		postID := model.NewId()
		source := newFakeSource(makeRows(postID, 4))
		target := &fakeTarget{}
		wantErr := errors.New("progress failed")

		copied, canceled, err := copyPostDeliveries(ctx, source, target, postID, jobID, 2, neverStop, func(int) error { return wantErr })
		require.ErrorIs(t, err, wantErr)
		require.False(t, canceled)
		require.Equal(t, 2, copied, "the first batch was written before progress failed")
	})

	t.Run("non-positive batch size falls back to the default", func(t *testing.T) {
		postID := model.NewId()
		source := newFakeSource(makeRows(postID, 3))
		target := &fakeTarget{}

		copied, _, err := copyPostDeliveries(ctx, source, target, postID, jobID, 0, neverStop, nil)
		require.NoError(t, err)
		require.Equal(t, 3, copied)
		require.Equal(t, 1, target.calls, "default batch size is large, so a single page suffices")
	})
}
