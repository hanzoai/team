// src/crm/data-provider.ts

import { call } from '~/data/http.ts';

// Local storage mocks for sqlite/kv in memory for dev
const localSql: Record<string, any[]> = {};
const localKv: Record<string, any> = {};

class CRMDataProvider {
  private mode: 'local' | 'cloud' = 'local';

  setMode(mode: 'local' | 'cloud') {
    this.mode = mode;
  }

  async query(table: string, query: string, _params: any[] = []) {
    if (this.mode === 'local') {
      return localSql[table] || [];
    }
    return await call(`/v1/crm/${table}?q=${encodeURIComponent(query)}`);
  }

  async set(key: string, value: any) {
    if (this.mode === 'local') {
      localKv[key] = value;
    } else {
      await call('/v1/kv/set', { method: 'POST', body: JSON.stringify({ key, value }) });
    }
  }

  async get(key: string) {
    if (this.mode === 'local') {
      return localKv[key];
    }
    return await call(`/v1/kv/get?key=${key}`);
  }
}

export const dataProvider = new CRMDataProvider();
