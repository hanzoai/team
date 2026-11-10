import assert from 'node:assert/strict'
import test from 'node:test'
import { cells, inView, records, views } from './catalog.ts'

test('views use canonical owners and never expose a transactional sender', () => {
  assert.equal(new Set(views.map((v) => v.id)).size, views.length)
  for (const view of views) {
    assert.doesNotMatch(JSON.stringify(view), /\/v1\/notify/)
    if (view.group === 'CRM & Growth') assert.equal(new URL(view.href).host, 'crm.hanzo.ai')
    if (view.group === 'Publishing') assert.equal(new URL(view.href).host, 'cms.hanzo.ai')
  }
})
test('distinguishes an empty collection from a missing or malformed envelope', () => {
  assert.deepEqual(records({ data: [] }, '/v1/social/posts'), [])
  assert.deepEqual(records({ items: [{ id: 'a' }] }, '/v1/base/collections/tasks/records'), [{ id: 'a' }])
  for (const reply of [{ items: [] }, { data: [null] }, null])
    assert.throws(() => records(reply, '/v1/social/accounts'))
})
test('reviews and schedule only include their respective workflow states', () => {
  assert.equal(inView('reviews', { status: 'in_review' }), true)
  assert.equal(inView('reviews', { status: 'published' }), false)
  assert.equal(inView('calendar', { status: 'draft' }), false)
  assert.equal(inView('calendar', { status: 'scheduled' }), true)
})
test('missing evidence stays unknown and zero spend is preserved', () => {
  assert.deepEqual(cells('consent', { name: 'Example', consent: {} }), ['Example', 'Unknown'])
  assert.equal(cells('campaigns', { spend: 0 })[3], '$0.00')
})
