// Package transactor serves the Huly workspace data plane the frontend connects
// to after selectWorkspace. The wire is ZAP — Hanzo/Lux's native zero-copy
// transport format — NOT msgpack and NOT Huly's WS+RPCHandler framing.
//
// Every frame is a single ZAP Envelope object tunnelling one Huly RPC. The
// envelope carries a JSON payload (Huly's method params/results are model-driven
// and far too numerous to schema individually), so we get ZAP's wire framing
// without a Cap'n-Proto-style type per Tx. The browser side (a byte-identical
// TS port in team dev/prod/src/zap-envelope.ts) speaks the same Envelope.
//
// We hand-encode the ZAP wire format rather than import luxfi/zap: the codec is
// ~40 lines, the format is fixed, and it keeps team-go free of the private
// luxfi/zap module (and its transitive churn). The exact bytes are locked by
// TestGoldenHex — the same golden the TS port is verified against.
//
// Envelope wire layout (ZAP Version2, little-endian):
//
//	header[16]  "ZAP\0" | version u16=2 | flags u16=0 | rootOffset u32=16 | size u32
//	object @16  fixed section, 24 bytes:
//	            id      @0  u32
//	            kind    @4  u8   (0=request 1=response 2=push)
//	            method  @8  ptr  (relOffset u32 @8,  length u32 @12)
//	            payload @16 ptr  (relOffset u32 @16, length u32 @20)
//	            then method bytes, then payload bytes — appended after the fixed
//	            section in field order. An empty value is a (relOffset=0,len=0)
//	            null pointer with no bytes appended.
package transactor

import (
	"encoding/binary"
	"errors"
)

// Kind discriminates the three frame directions on the wire.
type Kind uint8

const (
	KindRequest  Kind = 0 // client → server call
	KindResponse Kind = 1 // server → client reply (correlated by ID)
	KindPush     Kind = 2 // server → client broadcast (ID is ignored)
)

const (
	zapHeader   = 16            // header size
	zapRoot     = 16            // root object offset (right after the header)
	zapData     = 24           // fixed section size: id4+kind1+pad3 + method ptr8 + payload ptr8
	zapFixedEnd = zapRoot + zapData // 40 — where the variable section begins
)

// field offsets within the object's fixed section.
const (
	fID      = 0
	fKind    = 4
	fMethod  = 8
	fPayload = 16
)

// ErrInvalid is returned for a malformed ZAP frame.
var ErrInvalid = errors.New("zap: invalid frame")

// Envelope is one decoded ZAP frame.
type Envelope struct {
	ID      uint32
	Kind    Kind
	Method  string
	Payload []byte // JSON
}

var le = binary.LittleEndian

// Encode serializes e into a single ZAP message.
func Encode(e Envelope) []byte {
	method := []byte(e.Method)
	payload := e.Payload

	// Append method then payload after the fixed section; each pointer's
	// forward relative offset is measured from its own field position.
	pos := zapFixedEnd
	var mRel uint32
	mAt := pos
	if len(method) > 0 {
		mRel = uint32(pos - (zapRoot + fMethod))
		pos += len(method)
	}
	var pRel uint32
	pAt := pos
	if len(payload) > 0 {
		pRel = uint32(pos - (zapRoot + fPayload))
		pos += len(payload)
	}
	size := pos

	buf := make([]byte, size)
	copy(buf[0:4], "ZAP\x00")
	le.PutUint16(buf[4:6], 2) // version
	le.PutUint16(buf[6:8], 0) // flags
	le.PutUint32(buf[8:12], zapRoot)
	le.PutUint32(buf[12:16], uint32(size))

	le.PutUint32(buf[zapRoot+fID:], e.ID)
	buf[zapRoot+fKind] = uint8(e.Kind)
	le.PutUint32(buf[zapRoot+fMethod:], mRel)
	le.PutUint32(buf[zapRoot+fMethod+4:], uint32(len(method)))
	le.PutUint32(buf[zapRoot+fPayload:], pRel)
	le.PutUint32(buf[zapRoot+fPayload+4:], uint32(len(payload)))

	copy(buf[mAt:], method)
	copy(buf[pAt:], payload)
	return buf
}

// Decode parses a ZAP message into an Envelope. The payload is copied out so
// the caller may retain it past the frame's lifetime.
func Decode(data []byte) (Envelope, error) {
	if len(data) < zapHeader || string(data[0:4]) != "ZAP\x00" {
		return Envelope{}, ErrInvalid
	}
	root := int(le.Uint32(data[8:12]))
	if root < zapHeader || root+zapData > len(data) {
		return Envelope{}, ErrInvalid
	}
	payload := readBytes(data, root+fPayload)
	cp := make([]byte, len(payload))
	copy(cp, payload)
	return Envelope{
		ID:      le.Uint32(data[root+fID:]),
		Kind:    Kind(data[root+fKind]),
		Method:  string(readBytes(data, root+fMethod)),
		Payload: cp,
	}, nil
}

// readBytes reads a (relOffset, length) forward pointer at pos. relOffset 0 is a
// null/empty pointer; out-of-bounds targets read as empty.
func readBytes(data []byte, pos int) []byte {
	if pos+8 > len(data) {
		return nil
	}
	rel := le.Uint32(data[pos:])
	if rel == 0 {
		return nil
	}
	length := int(le.Uint32(data[pos+4:]))
	abs := pos + int(rel)
	if abs < zapHeader || abs+length > len(data) {
		return nil
	}
	return data[abs : abs+length]
}
