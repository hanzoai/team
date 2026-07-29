/**
 * ONE source of truth for the functional e2e harness: target host, credentials,
 * readiness. Every helper + spec reads from here — nothing hardcoded in a spec.
 *
 * Target is the LIVE deployment (https://hanzo.team by default); point
 * E2E_TEAM_URL at another env to retarget the whole suite.
 *
 * Credentials are a REAL IAM account (SSO through hanzo.id). Never committed:
 * E2E_TENANT_USER + E2E_TENANT_PASSWORD (KMS: hanzo-console-iam-creds). A spec
 * that needs them and doesn't have them SKIPS with the exact env var named —
 * never silently green, never hard-failed on a missing secret.
 */

const trim = (s: string): string => s.replace(/\/+$/, '')

/** hanzo.team origin (the tracker/docs/chat workbench). */
export const TEAM_URL = trim(process.env.E2E_TEAM_URL || 'https://hanzo.team')

export const TENANT_USER = process.env.E2E_TENANT_USER || process.env.E2E_USER_EMAIL || 'z@hanzo.ai'
export const TENANT_PASSWORD = process.env.E2E_TENANT_PASSWORD || process.env.E2E_USER_PASSWORD || ''

/** True when a real user password is available (the SSO browser journey). */
export const haveTenantCreds = (): boolean => Boolean(TENANT_PASSWORD)

export const TENANT_SKIP =
  'set E2E_TENANT_USER + E2E_TENANT_PASSWORD (KMS: hanzo-console-iam-creds) to run authenticated team specs'

/** Unique run-scoped name so concurrent runs never collide on created objects. */
export const stamp = (base: string): string =>
  `${base} e2e-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`

/** The house mobile frame (iPhone 14 portrait) for the mobile variants. */
export const MOBILE = {
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
  userAgent:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
} as const
