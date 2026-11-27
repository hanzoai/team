#!/usr/bin/env node
/**
 * Minimal zero-dependency SPA static server for Playwright E2E against built `dist/`.
 */
import { createReadStream, existsSync, statSync } from 'node:fs'
import { createServer } from 'node:http'
import { extname, join, resolve } from 'node:path'

const DIST = resolve(process.cwd(), 'dist')
const PORT = Number(process.env.E2E_PORT || 4179)

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.json': 'application/json; charset=utf-8',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
}

const server = createServer((req, res) => {
  const rawPath = (req.url || '/').split('?')[0]
  const safePath = rawPath.replace(/\.\./g, '')
  let filePath = join(DIST, safePath === '/' ? 'index.html' : safePath)
  if (!existsSync(filePath) || statSync(filePath).isDirectory()) {
    filePath = join(DIST, 'index.html')
  }
  const type = MIME[extname(filePath)] || 'application/octet-stream'
  res.writeHead(200, { 'content-type': type, 'cache-control': 'no-store' })
  createReadStream(filePath).pipe(res)
})

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Serving dist/ at http://127.0.0.1:${PORT}`)
})
