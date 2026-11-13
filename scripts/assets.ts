// Copy @hanzo/app's portrait assets (`/agents/<id>.png`, `/bots/<name>.png`)
// into `public/` before dev/build so Vite emits them into `dist/`.
import { cpSync, existsSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const from = join(dirname(require.resolve('@hanzo/app')), '..', 'assets')
if (existsSync(from)) {
  cpSync(from, fileURLToPath(new URL('../public', import.meta.url)), { recursive: true })
}
