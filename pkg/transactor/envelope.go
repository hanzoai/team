// Package transactor serves the Huly workspace data plane the frontend connects
// to after selectWorkspace. The wire is ZAP (luxfi/zap), Hanzo's native
// zero-copy transport — NOT msgpack and NOT Huly's WS+RPCHandler framing.
//
// Every frame is a single ZAP Envelope object tunnelling one Huly RPC. The
// envelope carries a JSON payload (Huly's method params/results are model-driven
// and far too numerous to schema individually), so we get ZAP's framing and
// transport without hand-authoring a Cap'n-Proto type per Tx. The browser side
// (a hand-ported TS ZAP codec, byte-identical to this one) speaks the same
// Envelope.
//
// Envelope wire layout (ZAP Version2, little-endian; see luxfi/zap zap.go):
//
//	header[16]  Magic "ZAP\0" | Version=2 | Flags | RootOffset | Size
//	object @16  fixed section, dataSize=24:
//	            id      @0  uint32
//	            kind    @4  uint8   (0=request 1=response 2=push)
//	            method  @8  text ptr  (relOffset u32 @8, length u32 @12)
//	            payload @16 bytes ptr (relOffset u32 @16, length u32 @20)
//	            then the method bytes, then the payload bytes, appended in
//	            field order immediately after the fixed section.
package transactor

import (
	zap "github.com/luxfi/zap"
)

// Kind discriminates the three frame directions on the wire.
type Kind uint8

const (
	KindRequest  Kind = 0 // client → server call
	KindResponse Kind = 1 // server → client reply (correlated by ID)
	KindPush     Kind = 2 // server → client broadcast (ID is ignored)
)

// envDataSize is the fixed-section size: id(4) + kind(1) + pad(3) + method
// ptr(8) + payload ptr(8). Must cover the highest field end (payload at 16+8).
const envDataSize = 24

const (
	fEnvID      = 0
	fEnvKind    = 4
	fEnvMethod  = 8
	fEnvPayload = 16
)

// Envelope is one decoded ZAP frame.
type Envelope struct {
	ID      uint32
	Kind    Kind
	Method  string
	Payload []byte // JSON
}

// Encode serializes e into a single ZAP message.
func Encode(e Envelope) []byte {
	b := zap.NewBuilder(len(e.Method) + len(e.Payload) + 64)
	ob := b.StartObject(envDataSize)
	ob.SetUint32(fEnvID, e.ID)
	ob.SetUint8(fEnvKind, uint8(e.Kind))
	ob.SetText(fEnvMethod, e.Method) // appended first
	ob.SetBytes(fEnvPayload, e.Payload)
	ob.FinishAsRoot()
	return b.Finish()
}

// Decode parses a ZAP message into an Envelope. The payload is copied out of
// the zero-copy buffer so the caller may retain it past the frame's lifetime.
func Decode(data []byte) (Envelope, error) {
	msg, err := zap.Parse(data)
	if err != nil {
		return Envelope{}, err
	}
	root := msg.Root()
	payload := root.Bytes(fEnvPayload)
	cp := make([]byte, len(payload))
	copy(cp, payload)
	return Envelope{
		ID:      root.Uint32(fEnvID),
		Kind:    Kind(root.Uint8(fEnvKind)),
		Method:  root.Text(fEnvMethod),
		Payload: cp,
	}, nil
}
