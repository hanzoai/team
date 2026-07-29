//
// ZAP envelope codec — the browser half of team-go's transactor wire.
//
// Byte-identical to team-go `pkg/transactor/envelope.go` (locked by its
// TestEnvelopeWireLayout). ZAP is luxfi/zap's own zero-copy format (NOT
// Cap'n-Proto), so this is a hand-port of that wire layout, not a library.
//
// Layout (ZAP Version2, little-endian):
//   header[16]: "ZAP\0" | version u16=2 | flags u16=0 | rootOffset u32=16 | size u32
//   object @16, fixed section 24 bytes:
//     id      @0  u32
//     kind    @4  u8   (0=request 1=response 2=push)
//     method  @8  ptr  (relOffset u32 @8,  length u32 @12)
//     payload @16 ptr  (relOffset u32 @16, length u32 @20)
//   then method bytes, then payload bytes — appended after the fixed section in
//   field order. A pointer to empty data is (relOffset=0, length=0) with no
//   bytes appended (matches luxfi/zap SetBytes).
//

export const KIND_REQUEST = 0
export const KIND_RESPONSE = 1
export const KIND_PUSH = 2

export interface Envelope {
  id: number
  kind: number
  method: string
  payload: Uint8Array
}

const HEADER = 16
const ROOT = 16
const DATA = 24 // fixed section size
const FIXED_END = ROOT + DATA // 40

const enc = new TextEncoder()
const dec = new TextDecoder()

export function encodeEnvelope (env: Envelope): ArrayBuffer {
  const method = enc.encode(env.method)
  const payload = env.payload

  // Append method then payload after the fixed section, computing each
  // pointer's forward relative offset from its own field position.
  let pos = FIXED_END
  const mRel = method.length > 0 ? pos - (ROOT + 8) : 0
  const mAt = pos
  if (method.length > 0) pos += method.length
  const pRel = payload.length > 0 ? pos - (ROOT + 16) : 0
  const pAt = pos
  if (payload.length > 0) pos += payload.length
  const size = pos

  const buf = new ArrayBuffer(size)
  const dv = new DataView(buf)
  const u8 = new Uint8Array(buf)

  // header
  u8[0] = 0x5a // 'Z'
  u8[1] = 0x41 // 'A'
  u8[2] = 0x50 // 'P'
  u8[3] = 0x00
  dv.setUint16(4, 2, true) // version
  dv.setUint16(6, 0, true) // flags
  dv.setUint32(8, ROOT, true)
  dv.setUint32(12, size, true)

  // object
  dv.setUint32(ROOT + 0, env.id >>> 0, true)
  u8[ROOT + 4] = env.kind & 0xff
  dv.setUint32(ROOT + 8, mRel, true)
  dv.setUint32(ROOT + 12, method.length, true)
  dv.setUint32(ROOT + 16, pRel, true)
  dv.setUint32(ROOT + 20, payload.length, true)

  if (method.length > 0) u8.set(method, mAt)
  if (payload.length > 0) u8.set(payload, pAt)
  return buf
}

export function decodeEnvelope (buf: ArrayBuffer): Envelope {
  const dv = new DataView(buf)
  const u8 = new Uint8Array(buf)
  if (u8.length < HEADER || u8[0] !== 0x5a || u8[1] !== 0x41 || u8[2] !== 0x50 || u8[3] !== 0x00) {
    throw new Error('zap: invalid magic')
  }
  const root = dv.getUint32(8, true)
  return {
    id: dv.getUint32(root + 0, true),
    kind: u8[root + 4],
    method: dec.decode(readBytes(dv, u8, root + 8)),
    payload: readBytes(dv, u8, root + 16)
  }
}

// readBytes mirrors luxfi/zap Object.Bytes: an unsigned forward relOffset from
// the field position, then length; relOffset 0 means null/empty.
function readBytes (dv: DataView, u8: Uint8Array, pos: number): Uint8Array {
  const rel = dv.getUint32(pos, true)
  if (rel === 0) return new Uint8Array(0)
  const len = dv.getUint32(pos + 4, true)
  const abs = pos + rel
  if (abs < HEADER || abs + len > u8.length) return new Uint8Array(0)
  return u8.subarray(abs, abs + len)
}
