// Ambient type declarations for the hanzo/base JSVM runtime.
//
// The real generated types live in hanzo/base/plugins/jsvm/internal/types
// and ship with @hanzo/base. This stub is intentionally minimal — it
// shadows just enough for `bun run typecheck` to be happy on the
// .fn.ts files in this directory. Replace with a re-export once the
// generated types land as a published package.

declare function routerAdd(
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
  path: string,
  handler: (e: RequestEvent) => any
): void;

declare const $app: {
  newMailClient(): { send(m: any): void };
  findRecordById(collection: string, id: string): any;
  findFirstRecordByFilter(collection: string, filter: string, params?: Record<string, any>): any;
  save(record: any): void;
  delete(record: any): void;
  logger(): { info: (m: string, ...kv: any[]) => void; error: (m: string, ...kv: any[]) => void };
};

declare const $os: {
  getenv(key: string): string;
};

declare const $http: {
  send(opts: {
    url:      string;
    method?:  string;
    body?:    string;
    headers?: Record<string, string>;
    timeout?: number;
  }): { statusCode: number; headers: Record<string, string[]>; body: string };
};

interface RequestEvent {
  auth: null | {
    id: string;
    email(): string;
    get(field: string): any;
  };
  request:    Request;
  response:   Response;
  requestInfo(): { body: any; query: Record<string, string> };
  json(status: number, body: any): any;
}

declare class MailerMessage {
  constructor(opts: {
    from:    { address: string; name?: string };
    to:      Array<{ address: string; name?: string }>;
    subject: string;
    html?:   string;
    text?:   string;
  });
}

declare function migrate(
  up: (app: any) => void,
  down?: (app: any) => void
): void;

declare class Collection {
  id: string;
  constructor(spec: {
    type:    "base" | "auth" | "view";
    name:    string;
    fields?: any[];
    indexes?: string[];
  });
}
