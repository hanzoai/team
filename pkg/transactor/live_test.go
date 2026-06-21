package transactor

import (
	"encoding/json"
	"os"
	"testing"
	"time"

	"github.com/hanzoai/team-go/pkg/token"
	"golang.org/x/net/websocket"
)

// TestLiveTransactor exercises the DEPLOYED transactor over a real WebSocket,
// speaking ZAP exactly as the browser will. Skipped unless TRANSACTOR_LIVE_URL
// is set (e.g. wss://hanzo.team/transactor), so it never runs in the unit suite.
//
//	TRANSACTOR_LIVE_URL=wss://hanzo.team/transactor \
//	  GOWORK=off go test ./pkg/transactor/ -run TestLiveTransactor -v
func TestLiveTransactor(t *testing.T) {
	base := os.Getenv("TRANSACTOR_LIVE_URL")
	if base == "" {
		t.Skip("set TRANSACTOR_LIVE_URL to run the live transactor smoke test")
	}
	secret := os.Getenv("SERVER_SECRET")
	if secret == "" {
		secret = token.DefaultSecret
	}
	const account = "2d4d67ab-30f1-474e-b81f-f60461852259"
	const workspace = "e48f81fd-12be-4bcd-aecb-3eaa9a9b5b18"
	tok, err := token.Generate(account, workspace, nil, secret)
	if err != nil {
		t.Fatal(err)
	}

	conn, err := websocket.Dial(base+"/"+tok+"?sessionId=smoke", "", "https://hanzo.team")
	if err != nil {
		t.Fatalf("dial: %v", err)
	}
	defer conn.Close()
	conn.SetDeadline(time.Now().Add(20 * time.Second))

	// hello — must come back binary:false (no msgpack).
	send(t, conn, `{"id":-1,"method":"hello","params":[]}`)
	hello := recv(t, conn)
	if hello["result"] != "hello" || hello["binary"] != false {
		t.Fatalf("hello reply = %v", hello)
	}
	t.Logf("hello OK: binary=%v serverVersion=%v", hello["binary"], hello["serverVersion"])

	// loadModel — must return the full 3558-Tx model.
	send(t, conn, `{"id":2,"method":"loadModel","params":[0]}`)
	model := recv(t, conn)
	res, _ := model["result"].(map[string]any)
	txs, _ := res["transactions"].([]any)
	if len(txs) != 3558 {
		t.Fatalf("loadModel transactions = %d, want 3558", len(txs))
	}
	t.Logf("loadModel OK: %d transactions, full=%v", len(txs), res["full"])
}

func send(t *testing.T, conn *websocket.Conn, hulyJSON string) {
	t.Helper()
	frame := Encode(Envelope{ID: 1, Kind: KindRequest, Payload: []byte(hulyJSON)})
	if err := websocket.Message.Send(conn, frame); err != nil {
		t.Fatalf("send: %v", err)
	}
}

func recv(t *testing.T, conn *websocket.Conn) map[string]any {
	t.Helper()
	var frame []byte
	if err := websocket.Message.Receive(conn, &frame); err != nil {
		t.Fatalf("receive: %v", err)
	}
	env, err := Decode(frame)
	if err != nil {
		t.Fatalf("decode envelope: %v", err)
	}
	var m map[string]any
	if err := json.Unmarshal(env.Payload, &m); err != nil {
		t.Fatalf("decode payload: %v (%s)", err, env.Payload)
	}
	return m
}
