// Package subscribe is a WebSocket endpoint that fans out Base record
// events to org-scoped, authed clients.
//
//	GET /v1/subscribe?collection=<name>[&filter=<expr>]
//
// On every OnRecordAfter{Create,Update,Delete}Success in the matched
// collection, the client receives:
//
//	{ "type":"create|update|delete", "collection":"<name>",
//	  "record": {...record JSON...} }
//
// Auth: must have re.Auth (any IAM user). Org scope: the event is
// only sent if the client's auth record can read it under the
// collection's ViewRule (delegates to app.CanAccessRecord — same
// gate the Base record CRUD uses, so subscribe can't leak more than
// a normal GET would).
//
// Transport: x/net/websocket. We do NOT pull in gorilla/websocket
// because the only thing we actually need from it is per-message
// fragment control, and the broadcast pattern here is one tiny
// JSON object per event — message-mode codec is exactly right.
package subscribe

import (
	"encoding/json"
	"errors"
	"net/http"
	"strings"
	"sync"

	"github.com/hanzoai/base/core"
	"github.com/hanzoai/base/tools/hook"
	"golang.org/x/net/websocket"
)

// hubKey identifies a subscriber. Pointer identity is enough; we
// never round-trip the value across goroutines beyond the hub map.
type subscriber struct {
	collection string
	auth       *core.Record
	out        chan []byte
}

type hub struct {
	mu   sync.RWMutex
	subs map[*subscriber]struct{}
}

func newHub() *hub { return &hub{subs: make(map[*subscriber]struct{})} }

func (h *hub) add(s *subscriber)    { h.mu.Lock(); h.subs[s] = struct{}{}; h.mu.Unlock() }
func (h *hub) remove(s *subscriber) { h.mu.Lock(); delete(h.subs, s); h.mu.Unlock() }

// snapshot returns the current subscriber set without holding the
// lock across the per-sub access check + channel send (which can
// block on a slow client). Locking long enough to copy a small
// pointer slice is the right tradeoff.
func (h *hub) snapshot() []*subscriber {
	h.mu.RLock()
	defer h.mu.RUnlock()
	out := make([]*subscriber, 0, len(h.subs))
	for s := range h.subs {
		out = append(out, s)
	}
	return out
}

// Register binds /v1/subscribe and the record hooks on the app.
func Register(app core.App) {
	h := newHub()
	bindHooks(app, h)
	app.OnServe().Bind(&hook.Handler[*core.ServeEvent]{
		Func: func(e *core.ServeEvent) error {
			e.Router.GET("/v1/subscribe", func(re *core.RequestEvent) error {
				return handle(re, h)
			})
			return e.Next()
		},
	})
}

func handle(re *core.RequestEvent, h *hub) error {
	if re.Auth == nil {
		return re.UnauthorizedError("subscribe requires auth", nil)
	}
	coll := strings.TrimSpace(re.Request.URL.Query().Get("collection"))
	if coll == "" {
		return re.BadRequestError("missing ?collection", nil)
	}
	// Validate the collection exists up front — otherwise the client
	// holds a socket open forever expecting events that will never
	// fire (the hook does an exact-match by collection name).
	if _, err := re.App.FindCachedCollectionByNameOrId(coll); err != nil {
		return re.NotFoundError("unknown collection", err)
	}

	sub := &subscriber{
		collection: coll,
		auth:       re.Auth,
		out:        make(chan []byte, 64),
	}
	h.add(sub)

	srv := websocket.Server{
		// Permissive origin check: this endpoint is mounted same-
		// origin behind api.hanzo.ai's gateway, which already
		// enforces CORS + JWT. A second wall here just breaks
		// localhost dev.
		Handshake: func(c *websocket.Config, r *http.Request) error { return nil },
		Handler: func(ws *websocket.Conn) {
			defer h.remove(sub)
			defer ws.Close()
			pump(ws, sub)
		},
	}
	srv.ServeHTTP(re.Response, re.Request)
	return nil
}

// pump runs both directions on the connection: writes drain sub.out;
// reads exist only so the websocket layer notices client-side close
// (browsers occasionally send pings/empty frames we just drop).
func pump(ws *websocket.Conn, sub *subscriber) {
	done := make(chan struct{})
	go func() {
		defer close(done)
		var discard string
		for {
			if err := websocket.Message.Receive(ws, &discard); err != nil {
				return
			}
		}
	}()
	for {
		select {
		case msg := <-sub.out:
			if err := websocket.Message.Send(ws, string(msg)); err != nil {
				return
			}
		case <-done:
			return
		}
	}
}

// bindHooks attaches once-per-app listeners that fan out the three
// record-success events to every matching subscriber. Each hook calls
// app.CanAccessRecord with the subscriber's auth — the same gate the
// Base record CRUD applies — so a subscriber sees exactly what a GET
// would have returned.
func bindHooks(app core.App, h *hub) {
	emit := func(eventType string) func(*core.RecordEvent) error {
		return func(re *core.RecordEvent) error {
			if re.Record == nil {
				return re.Next()
			}
			collName := re.Record.Collection().Name

			for _, sub := range h.snapshot() {
				if sub.collection != collName {
					continue
				}
				ok, err := canRead(app, sub.auth, re.Record)
				if err != nil || !ok {
					continue
				}
				payload, err := json.Marshal(map[string]any{
					"type":       eventType,
					"collection": collName,
					"record":     re.Record.PublicExport(),
				})
				if err != nil {
					continue
				}
				select {
				case sub.out <- payload:
				default:
					// Slow client — drop. We keep the conn open;
					// next event might land. If it never drains
					// the read pump still notices a TCP close.
				}
			}
			return re.Next()
		}
	}
	app.OnRecordAfterCreateSuccess().BindFunc(emit("create"))
	app.OnRecordAfterUpdateSuccess().BindFunc(emit("update"))
	app.OnRecordAfterDeleteSuccess().BindFunc(emit("delete"))
}

// canRead checks whether the auth record satisfies the collection's
// ViewRule. We synthesize a RequestInfo with just the auth field —
// no superuser, no body, no query — because that's all the rule
// resolver needs to evaluate "@request.auth.id" and "@collection.*"
// expressions. If a rule references @request.body/@request.query it
// will resolve to empty (rules over body in a subscription context
// don't make sense anyway).
func canRead(app core.App, auth *core.Record, rec *core.Record) (bool, error) {
	if rec == nil || rec.Collection() == nil {
		return false, errors.New("nil record/collection")
	}
	rule := rec.Collection().ViewRule
	info := &core.RequestInfo{
		Auth:   auth,
		Method: http.MethodGet,
		Query:  map[string]string{},
		Body:   map[string]any{},
	}
	return app.CanAccessRecord(rec, info, rule)
}
