import assert from 'node:assert/strict'
import { test } from 'node:test'

import { cart } from './start.ts'

const HERE = 'https://hanzo.team'

test('a bare /start sells Team and comes back', () => {
  const url = new URL(cart('', HERE))
  assert.equal(url.origin + url.pathname, 'https://hanzo.ai/pay/cart')
  assert.equal(url.searchParams.get('plan'), 'team')
  assert.equal(url.searchParams.get('returnUrl'), 'https://hanzo.team/')
})

test("the link's plan, term, seats and code ride along", () => {
  const url = new URL(cart('?plan=team-premium&interval=year&quantity=5&coupon=X1', HERE))
  assert.equal(url.searchParams.get('plan'), 'team-premium')
  assert.equal(url.searchParams.get('interval'), 'year')
  assert.equal(url.searchParams.get('quantity'), '5')
  assert.equal(url.searchParams.get('coupon'), 'X1')
})

test('a link cannot name where the checkout returns', () => {
  const url = new URL(cart('?returnUrl=https://evil.example/', HERE))
  assert.equal(url.searchParams.get('returnUrl'), 'https://hanzo.team/')
})
