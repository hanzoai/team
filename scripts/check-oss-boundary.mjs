#!/usr/bin/env node
/**
 * Architectural boundary & appearance contract check (hanzoai/team#44, hanzoai/ui#338):
 * 1. Public `hanzoai/team` must never depend on private `hanzo-inc/*` packages.
 * 2. `src/theme/tokens.css` must never use `!important` on semantic theme roles
 *    (--primary, --accent, --highlight) so @hanzo/appearance preferences win cleanly.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = process.cwd()
const violations = []

const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'))
for (const field of ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies']) {
  for (const [name, spec] of Object.entries(pkg[field] ?? {})) {
    if (name.startsWith('@hanzo-inc/') || String(spec).includes('hanzo-inc/')) {
      violations.push(`package.json ${field}.${name}: ${spec} references private hanzo-inc`)
    }
  }
}

const tokensCss = readFileSync(join(ROOT, 'src/theme/tokens.css'), 'utf8')
for (const role of ['--primary', '--primary-foreground', '--primary-hover', '--accent', '--accent-foreground', '--highlight']) {
  const re = new RegExp(`${role}\\s*:[^;]*!important`, 'i')
  if (re.test(tokensCss)) {
    violations.push(`src/theme/tokens.css overrides ${role} with !important (breaks @hanzo/appearance)`)
  }
}

if (violations.length > 0) {
  console.error('OSS boundary check failed (hanzoai/team#44):')
  for (const v of violations) console.error('  -', v)
  process.exit(1)
}
console.log('hanzoai/team OSS boundary & appearance contract check passed.')
