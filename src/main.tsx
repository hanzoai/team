import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// THE FACES. Zen is authored in `@hanzo/font`, which ships the woff2 the
// `@font-face` needs; `@hanzo/ui`'s theme.css only names the family. Imported
// once, here, so the `--font-sans` token resolves to a real face rather than the
// system fallback.
import '@hanzo/font/css'
// THE ROLES. `src/theme/theme.ts` names them and every component reads them from
// there; this is where their values arrive. Without it every `var(--team-…)`
// resolves to nothing and the product paints as unstyled text.
import '~/theme/tokens.css'
import { startTags } from '@hanzo/event'
import { App } from '~/app'
import { iam } from '~/data/iam.ts'

// THE TAGS. hanzo.team's Google tag and Meta pixel and the visitor's consent
// rule are cloud's answer for this host (GET /v1/project/tags); @hanzo/event
// loads each as that rule and the visitor's choice (`Consent`, in app.tsx)
// allow. The bearer lets cloud tell a member of Hanzo's own org apart: their
// visit is GA4 tagged internal and loads no pixel. Our own stream is not this:
// @hanzo/ui's components send it.
startTags({ token: () => iam().getAccessToken() ?? undefined })

const root = document.getElementById('root')
if (!root) throw new Error('no #root')

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
