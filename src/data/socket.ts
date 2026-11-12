/**
 * The space's data plane: one socket, and everything rides it.
 *
 * Reads, writes and other people's writes are the same connection. A frame is
 * a ZAP envelope (`zap.ts`) carrying one JSON-RPC message; a reply is
 * correlated by id, and a broadcast arrives with no id at all as
 * `{"result":[…txes]}` — which is exactly the shape a write's own reply
 * produces, so a card MOVED BY THIS BROWSER and a card moved by somebody else
 * reach the screen through the same line of code. That is deliberate: an
 * optimistic local patch beside a push is two implementations of one fact, and
 * they disagree the first time a write is refused.
 *
 * The credential is the space token, and it lives in the URL PATH. It is
 * bearer-equivalent, sitting somewhere proxies and access logs record, which is
 * why the server gives it twelve hours and why reconnecting takes a fresh one
 * rather than replaying the old.
 */
import { body, decode, encode, frame, Kind } from './zap.ts'
import { enter, type Entry } from './account.ts'
import { rows } from './rows.ts'

/** What the plane is doing, so a screen can say so rather than look empty. */
export type Standing = 'idle' | 'opening' | 'live' | 'lost'

/** A platform transaction, as it comes off the wire. */
export type Wire = { _class: string; objectId?: string; objectClass?: string; [k: string]: unknown }

type Waiting = { resolve: (v: unknown) => void; reject: (e: Error) => void }

const HEARTBEAT = 25_000
const BACKOFF = [500, 1_000, 2_000, 5_000, 10_000, 20_000]

/**
 * The space's data plane, as everything above it sees one.
 *
 * `Socket` is the one implementation: the real connection. Naming the concept
 * keeps the screens ignorant of the transport.
 */
export interface Plane {
  readonly standing: Standing
  /**
   * `hanzo:<account>` — how the platform spells a person in a transaction.
   *
   * The transactor takes a transaction's `modifiedBy` verbatim, so the author
   * is the client's to state and every writer needs it. It belongs to the
   * connection because that is what the credential named; null until one is
   * open, which is the honest answer while nothing is.
   */
  readonly account: string | null
  watch(f: (txes: Wire[]) => void): () => void
  observe(f: (s: Standing) => void): () => void
  open(): Promise<void>
  close(): void
  /** Every document of a class in this space, with the platform's own filters. */
  find<T>(cls: string, query?: Record<string, unknown>, options?: Record<string, unknown>): Promise<T[]>
  /** One document, or undefined. */
  one<T>(cls: string, query: Record<string, unknown>): Promise<T | undefined>
  /** Write. The reply is an acknowledgement; the CHANGE arrives on the broadcast. */
  write(tx: Wire): Promise<void>
}

export class Socket implements Plane {
  private socket: WebSocket | null = null
  private next = 1
  private waiting = new Map<number, Waiting>()
  private listeners = new Set<(txes: Wire[]) => void>()
  private standings = new Set<(s: Standing) => void>()
  private beat: ReturnType<typeof setInterval> | null = null
  private retry: ReturnType<typeof setTimeout> | null = null
  private attempt = 0
  private closed = false
  private opening: Promise<void> | null = null

  standing: Standing = 'idle'
  /** The credential this connection is running on. Re-taken on every open. */
  entry: Entry | null = null

  get account(): string | null {
    return this.entry ? `hanzo:${this.entry.account}` : null
  }

  constructor(private readonly slug: string) {}

  /** Every transaction the space produces, ours included. */
  watch(f: (txes: Wire[]) => void) {
    this.listeners.add(f)
    return () => void this.listeners.delete(f)
  }

  /** Whether the plane is live, for a screen that has to say. */
  observe(f: (s: Standing) => void) {
    this.standings.add(f)
    return () => void this.standings.delete(f)
  }

  async open(): Promise<void> {
    if (this.socket?.readyState === WebSocket.OPEN) return
    if (this.opening) return this.opening
    this.opening = this.connect().finally(() => {
      this.opening = null
    })
    return this.opening
  }

  close() {
    this.closed = true
    this.stopBeat()
    if (this.retry) clearTimeout(this.retry)
    this.socket?.close()
    this.socket = null
    this.settle('idle')
  }

  async find<T>(cls: string, query: Record<string, unknown> = {}, options: Record<string, unknown> = {}) {
    return rows<T>(await this.call<unknown>('findAll', [cls, query, options]))
  }

  async one<T>(cls: string, query: Record<string, unknown>) {
    return (await this.find<T>(cls, query, { limit: 1 }))[0]
  }

  async write(tx: Wire): Promise<void> {
    await this.call('tx', [tx])
  }

  async call<T>(method: string, params: unknown[] = []): Promise<T> {
    await this.open()
    const socket = this.socket
    if (!socket || socket.readyState !== WebSocket.OPEN) throw new Error('the space plane is not open')
    const id = this.next++
    return new Promise<T>((resolve, reject) => {
      this.waiting.set(id, { resolve: resolve as (v: unknown) => void, reject })
      socket.send(frame(id, Kind.request, method, { id, method, params }))
    })
  }

  // ── the connection ────────────────────────────────────────────────────────

  private async connect(): Promise<void> {
    this.closed = false
    this.settle('opening')
    // A fresh credential every time. The old one may have aged out, and a
    // socket refused for an expired token looks exactly like one refused for a
    // wrong origin — a 403 with no body either way.
    const entry = await enter(this.slug)
    this.entry = entry

    await new Promise<void>((resolve, reject) => {
      const socket = new WebSocket(`${entry.endpoint}/${entry.token}`)
      socket.binaryType = 'arraybuffer'
      this.socket = socket

      socket.onmessage = (e) => this.receive(e.data as ArrayBuffer | string)
      socket.onerror = () => reject(new Error('the space plane refused the connection'))
      socket.onclose = () => {
        this.stopBeat()
        for (const w of this.waiting.values()) w.reject(new Error('the space plane closed'))
        this.waiting.clear()
        if (this.closed) return
        this.settle('lost')
        this.later()
      }
      socket.onopen = () => {
        // hello is the handshake, not a formality: it settles the payload
        // encoding (JSON, never msgpack) and hands back the model version this
        // deployment serves.
        this.call('hello', [])
          .then(() => {
            this.attempt = 0
            this.settle('live')
            this.startBeat()
            resolve()
          })
          .catch(reject)
      }
    })
  }

  private receive(data: ArrayBuffer | string) {
    if (typeof data === 'string') return
    const env = decode(new Uint8Array(data))
    if (!env) return
    const text = body(env)
    if (text === 'pong!') return
    let message: { id?: number; result?: unknown; error?: unknown }
    try {
      message = JSON.parse(text) as typeof message
    } catch {
      return
    }
    // A broadcast carries no id and a list of transactions. So does a write's
    // own echo, which is why there is one branch here and not two.
    if (env.kind === Kind.push || message.id === undefined) {
      const txes = Array.isArray(message.result) ? (message.result as Wire[]) : []
      if (txes.length) for (const f of this.listeners) f(txes)
      return
    }
    const waiting = this.waiting.get(message.id)
    if (!waiting) return
    this.waiting.delete(message.id)
    if (message.error) waiting.reject(new Error(String(message.error)))
    else waiting.resolve(message.result)
  }

  private startBeat() {
    this.stopBeat()
    this.beat = setInterval(() => {
      // The heartbeat is a bare word inside an envelope, not a JSON-RPC call —
      // the server answers `pong!` the same way.
      if (this.socket?.readyState === WebSocket.OPEN) {
        this.socket.send(encode({ id: 0, kind: Kind.request, method: '', payload: new TextEncoder().encode('ping') }))
      }
    }, HEARTBEAT)
  }

  private stopBeat() {
    if (this.beat) clearInterval(this.beat)
    this.beat = null
  }

  private later() {
    const wait = BACKOFF[Math.min(this.attempt++, BACKOFF.length - 1)]
    this.retry = setTimeout(() => void this.open().catch(() => this.later()), wait)
  }

  private settle(s: Standing) {
    this.standing = s
    for (const f of this.standings) f(s)
  }
}
