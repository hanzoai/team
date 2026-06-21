package transactor

import (
	"encoding/json"
	"net/http"
	"os"
	"strings"

	"github.com/hanzoai/base/core"
	"github.com/hanzoai/base/tools/hook"
	"github.com/hanzoai/team-go/pkg/token"
	"golang.org/x/net/websocket"
)

// mount is the WS path the Huly client dials after selectWorkspace:
// wss://host/transactor/<workspace-token>?sessionId=<id>. The account API's
// selectWorkspace returns this base as the WorkspaceLoginInfo.endpoint.
const mount = "/transactor"

// pingFrame/pongFrame are Huly's literal heartbeat strings (client-resources
// index.ts pingConst/pongConst), carried verbatim inside a ZAP envelope.
const (
	pingFrame = "ping"
	pongFrame = "pong!"
)

// Register binds the ZAP transactor WebSocket on app.
func Register(app core.App) {
	secret := env("SERVER_SECRET", token.DefaultSecret)
	version := env("TEAM_VERSION", "dev")
	app.OnServe().Bind(&hook.Handler[*core.ServeEvent]{
		Func: func(e *core.ServeEvent) error {
			e.Router.GET(mount+"/{token...}", func(re *core.RequestEvent) error {
				return serve(re, app, secret, version)
			})
			return e.Next()
		},
	})
}

func serve(re *core.RequestEvent, app core.App, secret, version string) error {
	// The token is the path tail (a JWT, one segment); sessionId rides the query.
	raw := strings.TrimPrefix(re.Request.URL.Path, mount+"/")
	if i := strings.IndexByte(raw, '/'); i >= 0 {
		raw = raw[:i]
	}
	t, err := token.Decode(raw, secret, true)
	if err != nil || t.Account == "" || t.Workspace == "" {
		return re.UnauthorizedError("invalid workspace token", err)
	}
	sess := &session{
		app:       app,
		account:   t.Account,
		workspace: t.Workspace,
		version:   version,
		sessionID: re.Request.URL.Query().Get("sessionId"),
	}
	ws := websocket.Server{
		// Same-origin behind the cluster ingress (which enforces TLS); a second
		// origin wall here would only break local dev. The workspace token in
		// the path is the real authorization.
		Handshake: func(*websocket.Config, *http.Request) error { return nil },
		Handler: func(conn *websocket.Conn) {
			defer conn.Close()
			sess.loop(conn)
		},
	}
	ws.ServeHTTP(re.Response, re.Request)
	return nil
}

// session is one live transactor connection, scoped to a (workspace, account).
type session struct {
	app       core.App
	account   string
	workspace string
	version   string
	sessionID string
}

// loop is the frame pump: every WS frame is a ZAP envelope wrapping a Huly
// JSON-RPC message. Decode → dispatch → reply (ZAP-wrapped). msgpack never
// appears — hello negotiates binary:false so the client serializes JSON.
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
		out := Encode(Envelope{ID: env.ID, Kind: KindResponse, Payload: reply})
		if err := websocket.Message.Send(conn, out); err != nil {
			return
		}
	}
}

// request is the Huly JSON-RPC envelope carried inside the ZAP payload.
type request struct {
	ID     int64             `json:"id"`
	Method string            `json:"method"`
	Params []json.RawMessage `json:"params"`
}

// handle dispatches one Huly RPC and returns the JSON reply payload (or nil to
// send nothing).
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
		return s.result(req.ID, []any{}) // empty FindResult — workbench renders empty
	case "findOne":
		return s.result(req.ID, nil)
	case "loadDocs":
		return s.result(req.ID, []any{})
	case "searchFulltext":
		return s.result(req.ID, map[string]any{"docs": []any{}, "total": 0})
	case "loadChunk":
		return s.result(req.ID, map[string]any{"idx": 0, "docs": []any{}, "finished": true})
	case "getDomainHash":
		return s.result(req.ID, "")
	case "tx":
		// Accept and ack; broadcast/persistence land in a later phase.
		return s.result(req.ID, map[string]any{})
	default:
		return s.result(req.ID, nil)
	}
}

// hello answers the handshake. binary:false forces the client onto JSON so no
// msgpack is ever exchanged; lastHash/account let it build its model + identity.
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

// loadModel returns the full platform model as a LoadModelResponse. We always
// send full=true (the embedded model is the source of truth); the client
// rebuilds its hierarchy from it.
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
		"primarySocialId": s.account,
		"socialIds":       []string{s.account},
		"fullSocialIds":   []any{},
	}
}

func (s *session) result(id int64, value any) []byte {
	return mustJSON(map[string]any{"id": id, "result": value})
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
