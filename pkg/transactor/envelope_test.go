package transactor

import (
	"bytes"
	"encoding/binary"
	"testing"
)

func TestEnvelopeRoundTrip(t *testing.T) {
	cases := []Envelope{
		{ID: 1, Kind: KindRequest, Method: "hello", Payload: []byte(`{"binary":false}`)},
		{ID: 0, Kind: KindResponse, Method: "", Payload: []byte(`{"result":"hello"}`)},
		{ID: 4294967295, Kind: KindPush, Method: "tx", Payload: []byte("[]")},
		{ID: 7, Kind: KindRequest, Method: "findAll", Payload: nil},
	}
	for _, c := range cases {
		got, err := Decode(Encode(c))
		if err != nil {
			t.Fatalf("Decode(%q): %v", c.Method, err)
		}
		if got.ID != c.ID || got.Kind != c.Kind || got.Method != c.Method {
			t.Fatalf("header mismatch: got %+v want %+v", got, c)
		}
		if !bytes.Equal(got.Payload, c.Payload) && !(len(got.Payload) == 0 && len(c.Payload) == 0) {
			t.Fatalf("payload mismatch for %q: got %q want %q", c.Method, got.Payload, c.Payload)
		}
	}
}

// TestEnvelopeWireLayout locks the exact ZAP byte layout so the hand-ported TS
// codec in the front bundle can be verified byte-for-byte against it.
func TestEnvelopeWireLayout(t *testing.T) {
	method := "loadModel"
	payload := []byte(`{"last":0}`)
	data := Encode(Envelope{ID: 0x01020304, Kind: KindRequest, Method: method, Payload: payload})

	le := binary.LittleEndian
	if string(data[0:4]) != "ZAP\x00" {
		t.Fatalf("magic = %q", data[0:4])
	}
	if le.Uint16(data[4:6]) != 2 {
		t.Fatalf("version = %d", le.Uint16(data[4:6]))
	}
	root := int(le.Uint32(data[8:12]))
	if root != 16 {
		t.Fatalf("rootOffset = %d want 16", root)
	}
	if int(le.Uint32(data[12:16])) != len(data) {
		t.Fatalf("size = %d want %d", le.Uint32(data[12:16]), len(data))
	}
	// fixed section @16
	if le.Uint32(data[16:20]) != 0x01020304 {
		t.Fatalf("id = %x", le.Uint32(data[16:20]))
	}
	if data[20] != byte(KindRequest) {
		t.Fatalf("kind = %d", data[20])
	}
	// method ptr @24: relOffset must point to fixed-section end (16+24=40 => rel 16)
	mRel, mLen := le.Uint32(data[24:28]), le.Uint32(data[28:32])
	if mRel != 16 || int(mLen) != len(method) {
		t.Fatalf("method ptr rel=%d len=%d want 16,%d", mRel, mLen, len(method))
	}
	mAbs := 24 + int(mRel)
	if string(data[mAbs:mAbs+int(mLen)]) != method {
		t.Fatalf("method bytes = %q", data[mAbs:mAbs+int(mLen)])
	}
	// payload ptr @32: relOffset = 8 + len(method)
	pRel, pLen := le.Uint32(data[32:36]), le.Uint32(data[36:40])
	if int(pRel) != 8+len(method) || int(pLen) != len(payload) {
		t.Fatalf("payload ptr rel=%d len=%d want %d,%d", pRel, pLen, 8+len(method), len(payload))
	}
	pAbs := 32 + int(pRel)
	if !bytes.Equal(data[pAbs:pAbs+int(pLen)], payload) {
		t.Fatalf("payload bytes = %q", data[pAbs:pAbs+int(pLen)])
	}
}
