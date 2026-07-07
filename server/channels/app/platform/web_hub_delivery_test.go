// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

package platform

import (
	"testing"
	"time"

	"github.com/stretchr/testify/require"

	"github.com/mattermost/mattermost/server/public/model"
)

func TestHubRecordPostDelivery(t *testing.T) {
	t.Run("records the (postID, userID) pair", func(t *testing.T) {
		var gotPostID, gotUserID string
		h := &Hub{platform: &PlatformService{
			postDeliveryRecorder: func(postID, userID string) {
				gotPostID = postID
				gotUserID = userID
			},
		}}

		h.recordPostDelivery("post1", "u1")

		require.Equal(t, "post1", gotPostID)
		require.Equal(t, "u1", gotUserID)
	})

	t.Run("no-op when the recorder is not wired", func(t *testing.T) {
		h := &Hub{platform: &PlatformService{}}
		require.NotPanics(t, func() { h.recordPostDelivery("post1", "u1") })
	})

	t.Run("no-op when postID or userID is empty", func(t *testing.T) {
		called := false
		h := &Hub{platform: &PlatformService{
			postDeliveryRecorder: func(string, string) { called = true },
		}}

		h.recordPostDelivery("", "u1")
		h.recordPostDelivery("post1", "")

		require.False(t, called)
	})
}

type deliveredPair struct {
	postID string
	userID string
}

// deliveryRecorder captures every (postID, userID) pair the hub records.
type deliveryRecorder struct {
	pairs []deliveredPair
}

func (r *deliveryRecorder) record(postID, userID string) {
	r.pairs = append(r.pairs, deliveredPair{postID, userID})
}

// TestHubBroadcastToConnRecordsDelivery pins down the fix for
// https://github.com/mattermost/mattermost/pull/37261#discussion_r3516352024:
// a websocket delivery must be recorded only when the event is genuinely
// enqueued to a connection — not for every connection the broadcast considers.
func TestHubBroadcastToConnRecordsDelivery(t *testing.T) {
	mainHelper.Parallel(t)
	th := Setup(t)

	postID := model.NewId()

	// newFixture returns a fresh hub wired to its own recorder, an empty
	// connection index, and one registered, authenticated connection.
	newFixture := func() (*Hub, *deliveryRecorder, *hubConnectionIndex, *WebConn) {
		rec := &deliveryRecorder{}
		th.Service.SetPostDeliveryRecorder(rec.record)

		// fastIteration=false keeps hubConnectionIndex.Add off the store.
		connIndex := newHubConnectionIndex(time.Second, th.Service.Store, th.Service.logger, false)

		wc := newAuthedTestConn(t, th, connIndex)

		return &Hub{platform: th.Service}, rec, connIndex, wc
	}

	t.Run("records once when the event is delivered", func(t *testing.T) {
		hub, rec, connIndex, wc := newFixture()

		// Targeting wc.UserId makes ShouldSendEvent return true.
		msg := model.NewWebSocketEvent(model.WebsocketEventPosted, "", "", wc.UserId, nil, "")
		hub.broadcastToConn(connIndex, wc, msg, postID, nil, nil)

		require.Equal(t, []deliveredPair{{postID, wc.UserId}}, rec.pairs)
		require.Len(t, wc.send, 1, "the event should have been enqueued")
	})

	t.Run("does not record when ShouldSendEvent is false", func(t *testing.T) {
		hub, rec, connIndex, wc := newFixture()

		// Targeting a different user makes ShouldSendEvent return false, so the
		// connection is never even considered for a send.
		msg := model.NewWebSocketEvent(model.WebsocketEventPosted, "", "", model.NewId(), nil, "")
		hub.broadcastToConn(connIndex, wc, msg, postID, nil, nil)

		require.Empty(t, rec.pairs)
		require.Empty(t, wc.send, "nothing should have been enqueued")
		require.True(t, connIndex.Has(wc), "the connection should stay registered")
	})

	t.Run("does not record when the send buffer is full", func(t *testing.T) {
		hub, rec, connIndex, wc := newFixture()
		wc.Active.Store(false) // avoid the (expected) error log for a dropped active conn

		// Saturate the buffer so the non-blocking send falls to the default branch.
		for range sendQueueSize {
			wc.send <- &model.WebSocketEvent{}
		}

		msg := model.NewWebSocketEvent(model.WebsocketEventPosted, "", "", wc.UserId, nil, "")
		hub.broadcastToConn(connIndex, wc, msg, postID, nil, nil)

		require.Empty(t, rec.pairs, "a dropped event must not be recorded as delivered")
		require.False(t, connIndex.Has(wc), "the connection should be closed and removed")
	})

	t.Run("does not record when the connection is not registered", func(t *testing.T) {
		hub, rec, connIndex, _ := newFixture()

		// A connection that was never added to the index (e.g. it disconnected
		// between building the target list and the broadcast).
		other := newUnregisteredTestConn(t, th)

		msg := model.NewWebSocketEvent(model.WebsocketEventPosted, "", "", other.UserId, nil, "")
		hub.broadcastToConn(connIndex, other, msg, postID, nil, nil)

		require.Empty(t, rec.pairs)
		require.Empty(t, other.send)
	})
}

// newUnregisteredTestConn builds an authenticated connection with an empty send
// buffer that is NOT added to any connection index.
func newUnregisteredTestConn(t *testing.T, th *TestHelper) *WebConn {
	t.Helper()
	wc := &WebConn{
		Platform: th.Service,
		Suite:    th.Suite,
		UserId:   model.NewId(),
		send:     make(chan model.WebSocketMessage, sendQueueSize),
	}
	wc.SetConnectionID(model.NewId())
	wc.SetSession(&model.Session{})
	// A future expiry short-circuits IsBasicAuthenticated to true without a
	// session-store lookup; default test config leaves MFA unrequired.
	wc.SetSessionExpiresAt(model.GetMillis() + 60*60*1000)
	wc.Active.Store(true)
	return wc
}

// newAuthedTestConn is newUnregisteredTestConn plus registration in connIndex.
func newAuthedTestConn(t *testing.T, th *TestHelper, connIndex *hubConnectionIndex) *WebConn {
	t.Helper()
	wc := newUnregisteredTestConn(t, th)
	require.NoError(t, connIndex.Add(wc))
	return wc
}
