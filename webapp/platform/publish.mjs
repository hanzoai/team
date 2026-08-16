// Publish this fork's platform packages under the @hanzoteam scope.
//
// Run from webapp/platform:  REGISTRY_TOKEN=<forge write:package token> \
//                            node publish.mjs [client types shared ...]
//
// A package is published from a STAGING copy, never from the source tree, so a
// failed run cannot leave a rewritten package.json behind for the next build to
// pick up. Build first (`npm run build` in the package) — the manifest's `files`
// is what gets packed, and for these that is `lib`.
//
// THE MAP IS THE WHOLE DESIGN. `OURS` says which packages this fork publishes
// and what each is called once published, and it is read TWICE: once to rename
// the package, once to rewrite the dependencies. That is what makes the rewrite
// correct rather than a careful search-and-replace — a dependency is renamed if
// and only if we are the ones publishing it. The webapp also depends on four
// @mattermost packages we do NOT fork (`desktop-api`, `calls-common`,
// `use-external-link`, `no-dispatch-getstate`); they resolve from public npm and
// are left exactly as written, which a blanket `@mattermost/`→`@hanzoteam/`
// substitution would silently break by pointing them at packages nobody has
// published.
//
// This exists because the first publish was done by hand and got that wrong in
// one place: @hanzoteam/client shipped a peerDependency on `@mattermost/types`
// at THIS fork's version, 11.11.0 — a coordinate that exists in no registry,
// upstream or ours. npm 7+ installs peers automatically, so every `npm i
// @hanzoteam/client` died with ETARGET and the package was unusable from the
// moment it was published. Nothing in the source was wrong; the rename was
// applied to the name and not to what the name points at.
import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const OURS = {
    '@mattermost/client': '@hanzoteam/client',
    '@mattermost/components': '@hanzoteam/components',
    '@mattermost/eslint-plugin': '@hanzoteam/eslint-plugin',
    '@mattermost/shared': '@hanzoteam/shared',
    '@mattermost/types': '@hanzoteam/types',
    'mattermost-redux': '@hanzoteam/redux',
};

const REGISTRY = 'https://git.hanzo.ai/v1/packages/hanzoteam/npm/';
const HOME = 'https://git.hanzo.ai/hanzoteam/server';

// The directory each package lives in, derived from the published name so the
// two cannot drift: platform/<dir> is the tail of the SOURCE name.
const dirOf = (src) => (src.startsWith('@') ? src.split('/')[1] : src);

const token = process.env.REGISTRY_TOKEN;
if (!token) {
    throw new Error('REGISTRY_TOKEN is required (a forge token scoped write:package)');
}

// Default to every package we publish; a caller may name a subset.
const wanted = process.argv.slice(2);
const targets = Object.keys(OURS).filter((src) => !wanted.length || wanted.includes(dirOf(src)));
if (!targets.length) {
    throw new Error(`nothing to publish; known: ${Object.keys(OURS).map(dirOf).join(' ')}`);
}

for (const src of targets) {
    const dir = path.resolve(dirOf(src));
    const manifest = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8'));
    if (manifest.name !== src) {
        throw new Error(`${dir}: expected ${src}, found ${manifest.name}`);
    }

    manifest.name = OURS[src];
    for (const field of ['dependencies', 'devDependencies', 'peerDependencies', 'peerDependenciesMeta']) {
        const block = manifest[field];
        if (!block) {
            continue;
        }
        manifest[field] = Object.fromEntries(
            Object.entries(block).map(([dep, spec]) => [OURS[dep] ?? dep, spec]),
        );
    }
    manifest.homepage = `${HOME}/tree/master/webapp/platform/${dirOf(src)}`;
    manifest.repository = {type: 'git', url: `git+${HOME}.git`, directory: `webapp/platform/${dirOf(src)}`};
    manifest.keywords = ['hanzo', 'team'];

    // Stage: the manifest plus exactly what `files` declares. Publishing from a
    // copy is what keeps a failure from mutating the source tree.
    const stage = fs.mkdtempSync(path.join(os.tmpdir(), 'hanzoteam-'));
    fs.writeFileSync(path.join(stage, 'package.json'), `${JSON.stringify(manifest, null, 2)}\n`);
    for (const entry of manifest.files ?? []) {
        fs.cpSync(path.join(dir, entry), path.join(stage, entry), {recursive: true});
    }
    // The credential lives in the staging directory and dies with it, so it is
    // never written into the repository or into a shared npm config.
    fs.writeFileSync(
        path.join(stage, '.npmrc'),
        `@hanzoteam:registry=${REGISTRY}\n${REGISTRY.replace(/^https:/, '')}:_authToken=${token}\n`,
        {mode: 0o600},
    );

    execFileSync('npm', ['publish', '--access', 'public'], {cwd: stage, stdio: 'inherit'});
    fs.rmSync(stage, {recursive: true, force: true});
    process.stdout.write(`published ${manifest.name}@${manifest.version}\n`);
}
