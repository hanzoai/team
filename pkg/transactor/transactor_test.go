package transactor

import (
	"encoding/json"
	"os"
	"testing"
)

func testSession() *session {
	dir, _ := os.MkdirTemp("", "team-test")
	return &session{
		server:    &server{hub: newHub()},
		store:     newStore(dir),
		hier:      buildHierarchy(modelJSON),
		account:   "2d4d67ab-30f1-474e-b81f-f60461852259",
		workspace: "e48f81fd-12be-4bcd-aecb-3eaa9a9b5b18",
		version:   "test",
	}
}

// TestHelloNegotiatesJSON is the load-bearing no-msgpack assertion: the server
// answers hello with binary=false, so the client serializes JSON for the rest
// of the session and msgpack is never used.
func TestHelloNegotiatesJSON(t *testing.T) {
	out := testSession().handle([]byte(`{"id":-1,"method":"hello","params":[]}`))
	var r map[string]any
	if err := json.Unmarshal(out, &r); err != nil {
		t.Fatal(err)
	}
	if r["result"] != "hello" {
		t.Fatalf("result = %v", r["result"])
	}
	if r["binary"] != false {
		t.Fatalf("binary = %v (msgpack must be off)", r["binary"])
	}
	if r["useCompression"] != false {
		t.Fatalf("useCompression = %v", r["useCompression"])
	}
	if r["lastHash"] != modelHash {
		t.Fatalf("lastHash = %v", r["lastHash"])
	}
	acc, ok := r["account"].(map[string]any)
	if !ok || acc["uuid"] != "2d4d67ab-30f1-474e-b81f-f60461852259" {
		t.Fatalf("account = %v", r["account"])
	}
}

// TestLoadModelServesFullModel proves the embedded 3558-Tx model is returned in
// full so the client can build its hierarchy.
func TestLoadModelServesFullModel(t *testing.T) {
	out := testSession().handle([]byte(`{"id":1,"method":"loadModel","params":[0]}`))
	var r struct {
		ID     int64 `json:"id"`
		Result struct {
			Full         bool              `json:"full"`
			Hash         string            `json:"hash"`
			Transactions []json.RawMessage `json:"transactions"`
		} `json:"result"`
	}
	if err := json.Unmarshal(out, &r); err != nil {
		t.Fatal(err)
	}
	if r.ID != 1 || !r.Result.Full {
		t.Fatalf("id=%d full=%v", r.ID, r.Result.Full)
	}
	if len(r.Result.Transactions) != 3558 {
		t.Fatalf("transactions = %d, want 3558", len(r.Result.Transactions))
	}
	if r.Result.Hash != modelHash {
		t.Fatalf("hash mismatch")
	}
}

func TestHandleMisc(t *testing.T) {
	s := testSession()
	if string(s.handle([]byte("ping"))) != "pong!" {
		t.Fatal("ping must answer pong!")
	}
	// findAll over an empty workspace → an empty TotalArray (the wire shape the
	// client's rpc reviver turns back into a FindResult).
	var fa struct {
		Result struct {
			DataType string            `json:"dataType"`
			Total    int               `json:"total"`
			Value    []json.RawMessage `json:"value"`
		} `json:"result"`
	}
	json.Unmarshal(s.handle([]byte(`{"id":2,"method":"findAll","params":["core:class:Doc",{}]}`)), &fa)
	if fa.Result.DataType != "TotalArray" || fa.Result.Value == nil || len(fa.Result.Value) != 0 {
		t.Fatalf("findAll result = %+v, want empty TotalArray", fa.Result)
	}
	// domainRequest(communication) → a well-formed DomainResult so .value is never null.
	var dr struct {
		Result struct {
			Domain string `json:"domain"`
		} `json:"result"`
	}
	json.Unmarshal(s.handle([]byte(`{"id":3,"method":"domainRequest","params":["communication",{"findLabels":{}}]}`)), &dr)
	if dr.Result.Domain != "communication" {
		t.Fatalf("domainRequest domain = %q", dr.Result.Domain)
	}
	// tx → object ack, correlated id
	var tx struct {
		ID     int64          `json:"id"`
		Result map[string]any `json:"result"`
	}
	json.Unmarshal(s.handle([]byte(`{"id":9,"method":"tx","params":[{}]}`)), &tx)
	if tx.ID != 9 || tx.Result == nil {
		t.Fatalf("tx reply = %+v", tx)
	}
}

// TestEnvelopeWrapsRPC is the end-to-end transport check: a request wrapped in a
// ZAP envelope decodes, dispatches, and the reply re-wraps with the same id.
func TestEnvelopeWrapsRPC(t *testing.T) {
	req := Encode(Envelope{ID: 42, Kind: KindRequest, Payload: []byte(`{"id":42,"method":"hello","params":[]}`)})
	env, err := Decode(req)
	if err != nil {
		t.Fatal(err)
	}
	reply := testSession().handle(env.Payload)
	out := Encode(Envelope{ID: env.ID, Kind: KindResponse, Payload: reply})
	back, err := Decode(out)
	if err != nil {
		t.Fatal(err)
	}
	if back.ID != 42 || back.Kind != KindResponse {
		t.Fatalf("reply envelope id=%d kind=%d", back.ID, back.Kind)
	}
	var r map[string]any
	if err := json.Unmarshal(back.Payload, &r); err != nil || r["result"] != "hello" {
		t.Fatalf("reply payload = %s", back.Payload)
	}
}
