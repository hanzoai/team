/**
 * /start: where hanzo.ai's "Create your team" and "Create an Organization" lead.
 *
 * Buying Team is the checkout's, at hanzo.ai/pay: it signs a stranger in on
 * hanzo.ai, bills the organization they work in (switchable in its header), and
 * sells the per-seat plan. So this address only forwards there, keeping the
 * link's own query (a plan, a term, seats, a code), on Team when the link names
 * no plan, and asking to come back here once paid. The return is set last so a
 * link cannot name its own; pay honours it only for a host commerce allowlists.
 */
export const START = '/start'

const CART = 'https://pay.hanzo.ai/cart'

export const cart = (search: string, origin: string): string => {
  const url = new URL(CART)
  new URLSearchParams(search).forEach((value, key) => url.searchParams.set(key, value))
  if (!url.searchParams.get('plan')) url.searchParams.set('plan', 'team')
  url.searchParams.set('returnUrl', `${origin}/`)
  return url.toString()
}
