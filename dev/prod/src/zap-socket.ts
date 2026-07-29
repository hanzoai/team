//
// ZapSocket — adapts a browser WebSocket to the platform's ClientSocket, framing every
// message in a ZAP envelope (team-go's transactor wire).
//
// The platform Connection serializes JSON (we force client.metadata.UseBinaryProtocol
// = false in platform.ts), so the payload is an opaque UTF-8 string in both
// directions; ZAP supplies the wire transport. msgpack is never used.
//
// Injected via setMetadata(client.metadata.ClientSocketFactory, url => new
// ZapSocket(url)); the factory receives wss://host/transactor/<token>?sessionId=.
//

import { type ClientSocket, ClientSocketReadyState } from '@hanzo/client'
import { decodeEnvelope, encodeEnvelope, KIND_REQUEST } from './zap-envelope'

const enc = new TextEncoder()
const dec = new TextDecoder()

export class ZapSocket implements ClientSocket {
  onmessage: ((this: ClientSocket, ev: MessageEvent) => any) | null = null
  onclose: ((this: ClientSocket, ev: CloseEvent) => any) | null = null
  onopen: ((this: ClientSocket, ev: Event) => any) | null = null
  onerror: ((this: ClientSocket, ev: Event) => any) | null = null

  private readonly ws: WebSocket

  constructor (url: string) {
    this.ws = new WebSocket(url)
    this.ws.binaryType = 'arraybuffer'

    this.ws.onopen = (e) => {
      this.onopen?.call(this, e)
    }
    this.ws.onclose = (e) => {
      this.onclose?.call(this, e)
    }
    this.ws.onerror = (e) => {
      this.onerror?.call(this, e)
    }
    this.ws.onmessage = (ev: MessageEvent) => {
      if (this.onmessage == null) return
      const buf = asArrayBuffer(ev.data)
      if (buf == null) return
      const env = decodeEnvelope(buf)
      // Deliver the unwrapped message as a string (JSON mode); the platform's
      // readResponse JSON.parses it.
      this.onmessage.call(this, { data: dec.decode(env.payload) } as MessageEvent)
    }
  }

  send (data: string | ArrayBufferLike | Blob | ArrayBufferView): void {
    this.ws.send(encodeEnvelope({ id: 0, kind: KIND_REQUEST, method: '', payload: toBytes(data) }))
  }

  close (code?: number): void {
    this.ws.close(code)
  }

  get readyState (): ClientSocketReadyState {
    return this.ws.readyState as ClientSocketReadyState
  }

  get bufferedAmount (): number {
    return this.ws.bufferedAmount
  }
}

function asArrayBuffer (data: unknown): ArrayBuffer | null {
  if (data instanceof ArrayBuffer) return data
  if (ArrayBuffer.isView(data)) {
    const v = data as ArrayBufferView
    return v.buffer.slice(v.byteOffset, v.byteOffset + v.byteLength)
  }
  return null // unexpected text frame — ignore
}

function toBytes (data: string | ArrayBufferLike | Blob | ArrayBufferView): Uint8Array {
  if (typeof data === 'string') return enc.encode(data)
  if (data instanceof ArrayBuffer) return new Uint8Array(data)
  if (ArrayBuffer.isView(data)) {
    return new Uint8Array(data.buffer, data.byteOffset, data.byteLength)
  }
  // Blob is async-only; the client never sends Blobs through the client socket in JSON mode.
  throw new Error('ZapSocket: unsupported send payload type')
}
