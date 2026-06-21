package transactor

import (
	"encoding/json"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"sync"

	"github.com/hanzoai/base/core"
	"github.com/hanzoai/base/tools/hook"
	"github.com/hanzoai/team-go/pkg/token"
	"golang.org/x/net/websocket"
)

// mount is the WS path the client dials after selectWorkspace:
// wss://host/transactor/<workspace-token>?sessionId=<id>. The account API's
// selectWorkspace returns this base as the WorkspaceLoginInfo.endpoint.
const mount = "/transactor"

// Heartbeat frames (the client's pingConst/pongConst), carried verbatim inside
// a ZAP envelope.
const (
	pingFrame = "ping"
	pongFrame = "pong!"
)

// server holds the transactor's shared, process-lifetime state: the per-
// workspace SQLite store (the structured data plane — no KV, no Postgres), the
// class hierarchy parsed from the embedded model, and the live-broadcast hub.
type server struct {
	app     core.App
	store   *store
	hier    *hierarchy
	hub     *hub
	secret  string
	version string
}

// Register binds the ZAP transactor WebSocket on app.
func Register(app core.App) {
	srv := &server{
		app:     app,
		store:   newStore(filepath.Join(app.DataDir(), "team_workspaces")),
		hier:    buildHierarchy(modelJSON),
		hub:     newHub(),
		secret:  env("SERVER_SECRET", token.DefaultSecret),
		version: env("TEAM_VERSION", ""),
	}
	app.OnServe().Bind(&hook.Handler[*core.ServeEvent]{
		Func: func(e *core.ServeEvent) error {
			e.Router.GET(mount+"/{token...}", func(re *core.RequestEvent) error {
				return srv.serve(re)
			})
			return e.Next()
		},
	})
}

func (srv *server) serve(re *core.RequestEvent) error {
	// The token is the path tail (a JWT, one segment); sessionId rides the query.
	raw := strings.TrimPrefix(re.Request.URL.Path, mount+"/")
	if i := strings.IndexByte(raw, '/'); i >= 0 {
		raw = raw[:i]
	}
	t, err := token.Decode(raw, srv.secret, true)
	if err != nil || t.Account == "" || t.Workspace == "" {
		return re.UnauthorizedError("invalid workspace token", err)
	}
	sess := &session{
		server:    srv,
		store:     srv.store,
		hier:      srv.hier,
		account:   t.Account,
		workspace: t.Workspace,
		version:   srv.version,
		sessionID: re.Request.URL.Query().Get("sessionId"),
	}
	ws := websocket.Server{
		// Same-origin behind the cluster ingress (which enforces TLS); the
		// workspace token in the path is the real authorization.
		Handshake: func(*websocket.Config, *http.Request) error { return nil },
		Handler: func(conn *websocket.Conn) {
			defer conn.Close()
			sess.conn = conn
			sess.seedWorkspace()
			srv.hub.add(sess)
			defer srv.hub.remove(sess)
			sess.loop(conn)
		},
	}
	ws.ServeHTTP(re.Response, re.Request)
	return nil
}

// session is one live transactor connection, scoped to a (workspace, account).
type session struct {
	server    *server
	store     *store
	hier      *hierarchy
	conn      *websocket.Conn
	wmu       sync.Mutex // serializes writes (loop replies + hub broadcasts)
	account   string
	workspace string
	version   string
	sessionID string
}

// loop is the frame pump: every WS frame is a ZAP envelope wrapping a JSON-RPC
// message. Decode → dispatch → reply (ZAP-wrapped). msgpack never appears —
// hello negotiates binary:false so the client serializes JSON.
func (s *session) loop(conn *websocket.Conn) {
	for {
		var frame []byte
		if err := websocket.Message.Receive(conn, &frame); err != nil {
			return // client closed / read error
		}
		env, err := Decode(frame)
		if err != nil {
			continue // not a ZAP frame; ignore
		}
		reply := s.handle(env.Payload)
		if reply == nil {
			continue
		}
		if err := s.send(KindResponse, env.ID, reply); err != nil {
			return
		}
	}
}

// send writes one ZAP-wrapped payload, serialized against concurrent broadcasts.
func (s *session) send(kind Kind, id uint32, payload []byte) error {
	s.wmu.Lock()
	defer s.wmu.Unlock()
	return websocket.Message.Send(s.conn, Encode(Envelope{ID: id, Kind: kind, Payload: payload}))
}

// request is the JSON-RPC envelope carried inside the ZAP payload.
type request struct {
	ID     int64             `json:"id"`
	Method string            `json:"method"`
	Params []json.RawMessage `json:"params"`
}

// handle dispatches one RPC and returns the JSON reply payload (or nil).
func (s *session) handle(payload []byte) []byte {
	if string(payload) == pingFrame {
		return []byte(pongFrame)
	}
	var req request
	if err := json.Unmarshal(payload, &req); err != nil {
		return nil
	}
	switch req.Method {
	case "hello":
		return s.hello(req.ID)
	case "loadModel":
		return s.loadModel(req.ID)
	case "getAccount":
		return s.result(req.ID, s.accountObj())
	case "findAll":
		return s.findAll(req.ID, req.Params)
	case "findOne":
		return s.findOne(req.ID, req.Params)
	case "tx":
		return s.tx(req.ID, req.Params)
	case "domainRequest":
		return s.domainRequest(req.ID, req.Params)
	case "searchFulltext":
		// Full-text is served by hanzoai/search, not the SQLite data plane;
		// until that proxy lands an empty result keeps queries non-fatal.
		return s.result(req.ID, map[string]any{"docs": []any{}, "total": 0})
	case "loadChunk":
		return s.result(req.ID, map[string]any{"idx": 0, "docs": []any{}, "finished": true})
	case "getDomainHash":
		return s.result(req.ID, "")
	case "loadDocs":
		return s.result(req.ID, []any{})
	default:
		return s.result(req.ID, nil)
	}
}

// findAll resolves the queried class to its concrete descendants, scans the
// workspace store, filters by query (+ mixin), sorts, limits, and returns a
// TotalArray — the wire shape the client's rpc reviver expects.
func (s *session) findAll(id int64, params []json.RawMessage) []byte {
	var class string
	if len(params) > 0 {
		_ = json.Unmarshal(params[0], &class)
	}
	var query map[string]any
	if len(params) > 1 {
		_ = json.Unmarshal(params[1], &query)
	}
	var opts struct {
		Sort  json.RawMessage `json:"sort"`
		Limit *int            `json:"limit"`
	}
	if len(params) > 2 {
		_ = json.Unmarshal(params[2], &opts)
	}
	matched := s.queryDocs(class, query)
	resultSort(matched, parseSort(opts.Sort))
	total := len(matched)
	if opts.Limit != nil && *opts.Limit >= 0 && *opts.Limit < total {
		matched = matched[:*opts.Limit]
	}
	return s.result(id, totalArray(matched, total))
}

func (s *session) findOne(id int64, params []json.RawMessage) []byte {
	var class string
	if len(params) > 0 {
		_ = json.Unmarshal(params[0], &class)
	}
	var query map[string]any
	if len(params) > 1 {
		_ = json.Unmarshal(params[1], &query)
	}
	matched := s.queryDocs(class, query)
	if len(matched) == 0 {
		return s.result(id, nil)
	}
	return s.result(id, matched[0])
}

// queryDocs is the shared find core: candidate scan by class hierarchy, then
// mixin + query filtering.
func (s *session) queryDocs(class string, query map[string]any) []map[string]any {
	candidates := s.hier.candidates(class)
	docs, err := s.store.byClasses(s.workspace, candidates)
	if err != nil {
		return nil
	}
	isMixin := s.hier.isMixin(class)
	var matched []map[string]any
	for _, doc := range docs {
		if isMixin && !hasMixin(doc, class) {
			continue
		}
		if query != nil && !matchQuery(doc, query) {
			continue
		}
		matched = append(matched, doc)
	}
	return matched
}

// tx applies the transaction to the workspace store and broadcasts the applied
// tx(es) so every session's live queries refresh.
func (s *session) tx(id int64, params []json.RawMessage) []byte {
	if len(params) == 0 {
		return s.result(id, map[string]any{})
	}
	res, applied := s.applyTx(params[0])
	if len(applied) > 0 {
		s.server.hub.broadcast(s.workspace, applied)
	}
	return s.result(id, res)
}

// domainRequest serves operation-domain reads. The communication domain
// (labels, notifications, collaborators…) has no SQLite backing yet; returning
// a well-formed empty DomainResult keeps those live queries from crashing on
// `.value` of null.
func (s *session) domainRequest(id int64, params []json.RawMessage) []byte {
	var domain string
	if len(params) > 0 {
		_ = json.Unmarshal(params[0], &domain)
	}
	var op map[string]json.RawMessage
	if len(params) > 1 {
		_ = json.Unmarshal(params[1], &op)
	}
	var value any = []any{}
	for key := range op {
		if strings.HasPrefix(key, "findNotification") {
			value = map[string]any{"results": []any{}, "total": 0}
		}
	}
	return s.result(id, map[string]any{"domain": domain, "value": value})
}

// hello answers the handshake. binary:false forces JSON so no msgpack is ever
// exchanged; lastHash/account let the client build its model + identity.
func (s *session) hello(id int64) []byte {
	return mustJSON(map[string]any{
		"id":             id, // -1
		"result":         "hello",
		"binary":         false,
		"useCompression": false,
		"serverVersion":  s.version,
		"lastHash":       modelHash,
		"reconnect":      false,
		"account":        s.accountObj(),
	})
}

// loadModel returns the full platform model. We always send full=true (the
// embedded model is the source of truth); the client rebuilds its hierarchy.
func (s *session) loadModel(id int64) []byte {
	return mustJSON(map[string]any{
		"id": id,
		"result": map[string]any{
			"full":         true,
			"hash":         modelHash,
			"transactions": json.RawMessage(modelJSON),
		},
	})
}

// accountObj is the core Account the client caches from hello/getAccount.
func (s *session) accountObj() map[string]any {
	return map[string]any{
		"uuid":            s.account,
		"role":            "OWNER",
		"primarySocialId": "hanzo:" + s.account,
		"socialIds":       []string{"hanzo:" + s.account},
		"fullSocialIds":   []any{},
	}
}

func (s *session) result(id int64, value any) []byte {
	return mustJSON(map[string]any{"id": id, "result": value})
}

// totalArray is the serialized FindResult shape: the rpc reviver turns
// {dataType:'TotalArray',total,value} back into an array carrying .total.
func totalArray(docs []map[string]any, total int) map[string]any {
	if docs == nil {
		docs = []map[string]any{}
	}
	return map[string]any{"dataType": "TotalArray", "total": total, "value": docs}
}

func hasMixin(doc map[string]any, mixin string) bool {
	_, ok := doc[mixin].(map[string]any)
	return ok
}

func mustJSON(v any) []byte {
	b, err := json.Marshal(v)
	if err != nil {
		return []byte(`{"error":{"code":"marshal"}}`)
	}
	return b
}

func env(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

// ── live broadcast hub ────────────────────────────────────────────────────────

// hub fans applied txes to every open session of a workspace so live queries
// refresh in real time (and across a user's tabs).
type hub struct {
	mu sync.Mutex
	ws map[string]map[*session]bool
}

func newHub() *hub { return &hub{ws: map[string]map[*session]bool{}} }

func (h *hub) add(s *session) {
	h.mu.Lock()
	defer h.mu.Unlock()
	set := h.ws[s.workspace]
	if set == nil {
		set = map[*session]bool{}
		h.ws[s.workspace] = set
	}
	set[s] = true
}

func (h *hub) remove(s *session) {
	h.mu.Lock()
	defer h.mu.Unlock()
	if set := h.ws[s.workspace]; set != nil {
		delete(set, s)
		if len(set) == 0 {
			delete(h.ws, s.workspace)
		}
	}
}

func (h *hub) broadcast(workspace string, txes []json.RawMessage) {
	h.mu.Lock()
	var targets []*session
	for s := range h.ws[workspace] {
		targets = append(targets, s)
	}
	h.mu.Unlock()
	if len(targets) == 0 {
		return
	}
	// A no-id {result:[tx...]} message is the client's tx-broadcast shape.
	parts := make([]string, len(txes))
	for i, tx := range txes {
		parts[i] = string(tx)
	}
	payload := []byte(`{"result":[` + strings.Join(parts, ",") + `]}`)
	for _, s := range targets {
		_ = s.send(KindPush, 0, payload)
	}
}
