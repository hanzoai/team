import { hanzo } from '@hanzo/vite'
import react from '@vitejs/plugin-react'

/**
 * The bundler. Resolving the Hanzo runtime — `~/…`, react-native-web, one copy
 * of gui — comes from `hanzo()`, stated once for every Hanzo app rather than
 * copied into each. What is left is this app's own.
 *
 * There is no CSS pipeline because there is no CSS to build: @hanzo/ui ships one
 * generated stylesheet that `<Hanzo>` imports, and the styles gui derives from
 * props it inserts at runtime.
 */

/**
 * A single-page app has one document and many addresses, so every address that
 * is not a file has to arrive at that document. The Sites plane answers a miss
 * with the site's own `404.html`, so emitting the document under that name is
 * the whole fix, and it is the convention every static host already implements.
 * The status stays 404 — the browser runs the bundle regardless and the router
 * takes the address from there, while a crawler still reads "not a page I
 * publish", which is true of every address except the ones the router invents.
 */
const SPA_ROUTES = [
  'crm',
  'crm/opportunities',
  'crm/companies',
  'crm/contacts',
  'crm/investors',
  'crm/funds',
  'crm/customers',
  'crm/leads',
  'crm/lists',
  'crm/campaigns',
  'crm/deliverability',
  'chat',
  'issues',
  'bots',
  'apps',
  'inbox',
  'docs',
  'files',
  'cal',
  'mail',
  'admin',
  'settings',
  'people',
]

const fallback = {
  name: 'fallback',
  async writeBundle(options: { dir?: string }) {
    const { copyFile, mkdir } = await import('node:fs/promises')
    const { join } = await import('node:path')
    const dir = options.dir ?? 'dist'
    const src = join(dir, 'index.html')
    await copyFile(src, join(dir, '404.html'))
    for (const route of SPA_ROUTES) {
      const targetDir = join(dir, route)
      await mkdir(targetDir, { recursive: true })
      await copyFile(src, join(targetDir, 'index.html'))
    }
  },
}

/**
 * The dev proxy, and it is load-bearing rather than a convenience.
 *
 * `src/data` addresses `/v1` relatively so that no module in this app learns an
 * API host; without this the dev server answers its own index.html for every
 * call and a JSON parse fails somewhere far from the cause. It also makes the
 * issuer's credential exchange SAME-ORIGIN, which is what lets sign-in happen
 * in place on a loopback host that hanzo.id does not answer with
 * `Access-Control-Allow-Credentials`.
 */
const API = 'https://api.hanzo.ai'

const config = hanzo(
  {
    plugins: [react(), fallback],
    server: {
      port: 3095,
      // Reachable by LAN name in dev; vite 8 refuses an unlisted Host by
      // default. Dev only — a built app is static and has no host allowlist.
      allowedHosts: true,
      proxy: { '/v1': { target: API, changeOrigin: true } },
    },
  },
  {
    root: import.meta.dirname,
    dedupe: [
      '@hanzogui/web',
      '@hanzogui/core',
      '@hanzogui/config',
      '@hanzogui/create-theme',
      '@hanzogui/themes',
      '@hanzogui/lucide-icons-2',
      '@hanzogui/next-theme',
      '@hanzogui/telemetry',
      '@hanzogui/toast',
    ],
  },
)

/**
 * Dependency optimization is a SECOND resolution pass and inherits nothing from
 * the first, so it has to be told the same thing: on the web a react-native
 * package's `.web.js` sibling comes first. Left out, the optimizer follows
 * react-native-svg's fabric components into react-native's Flow source and the
 * DEV SERVER dies at startup — while `vite build`, which uses the resolver
 * above, succeeds, so nothing warns you until you try to develop.
 *
 * The list is read back from the config rather than restated: two copies of an
 * extension order is how one of them silently stops matching the other.
 */
export default {
  ...config,
  optimizeDeps: {
    rollupOptions: {
      resolve: { extensions: (config.resolve as { extensions: string[] }).extensions },
    },
  },
}
