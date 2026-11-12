/**
 * THE TRACKER'S NAVIGATOR: three standing entries, then your projects.
 *
 * A project row is a DISCLOSURE, not a link, which is what the reference draws:
 * the open project shows Issues, Components, Milestones and Templates, and it is
 * those four that are addresses. Giving the project row an address of its own
 * would make two controls for one destination and put a step in the trail that
 * nothing points at.
 *
 * The four states are the read's, not a flag: `loading` until the plane answers,
 * `failure` when it refuses, `empty` when it answers nothing, and the tree
 * otherwise. A screen scored from whichever of those happened to render is the
 * mistake this shape exists to prevent, so each says its own sentence.
 */
import { SizableText, Spinner, YStack } from '@hanzo/ui'
import { Archive, Folder, SquareCheck } from '@hanzogui/lucide-icons-2'
import { useState } from 'react'
import { useLocation, useParams } from 'react-router'

import type { Project } from '~/data/model'
import { useRead } from '~/data/query'
import { useSpace } from '~/data/space'
import { keys, projects } from '~/data/tracker'
import { Find, Fold, Group, Nav as Column, Roll, Row, Rule, Spine, surfaceAt } from '~/shell'
import { PAD } from '~/shell/measure'
import { mark, rung, slot } from '~/theme/theme'

/** The pages a project has, in the order the tree draws them. */
export const PAGES = ['issues', 'components', 'milestones', 'templates'] as const
export type Page = (typeof PAGES)[number]

const named = (page: Page) => page[0].toUpperCase() + page.slice(1)

export const Nav = () => {
  const [query, setQuery] = useState('')
  const { pathname } = useLocation()
  const { plane } = useSpace()
  const read = useRead(keys.projects(), () => projects(plane!), { enabled: !!plane })

  const found = (read.data ?? []).filter((p) =>
    p.name.toLowerCase().includes(query.trim().toLowerCase()),
  )

  return (
    <Column title={surfaceAt(pathname)?.label ?? 'Tracker'}>
      <Find value={query} onChange={setQuery} />
      <YStack height={24} />

      <Row to="/mine" icon={<Folder size={16} color="$soft" />}>My issues</Row>
      <Row to="/issues" icon={<SquareCheck size={16} color="$soft" />}>All issues</Row>
      <Rule />
      <Row to="/projects" icon={<Archive size={16} color="$soft" />}>All projects</Row>
      <Rule />

      <Roll>
        <Group>Your projects</Group>

        {read.phase === 'loading' ? (
          <YStack px={PAD} py={12}>
            <Spinner size={16} />
          </YStack>
        ) : null}

        {read.phase === 'failure' ? <Note>Your projects could not be read.</Note> : null}

        {read.phase === 'ready' && found.length === 0 ? (
          <Note>{query.trim() ? 'No project by that name.' : 'No projects yet.'}</Note>
        ) : null}

        {found.map((p) => (
          <Branch key={p._id} project={p} />
        ))}
      </Roll>
    </Column>
  )
}

/** One project and, while it is open, its pages. */
const Branch = ({ project }: { project: Project }) => {
  const here = useParams().id === project._id
  const [open, setOpen] = useState(here)

  return (
    <YStack>
      <Fold open={open} onPress={() => setOpen(!open)} icon={<Mark id={project._id} />}>
        {project.name}
      </Fold>
      {open ? (
        <Spine>
          {PAGES.map((page) => (
            <Row key={page} to={`/projects/${project._id}/${page}`} indent>
              {named(page)}
            </Row>
          ))}
        </Spine>
      ) : null}
    </YStack>
  )
}

/**
 * A project's glyph: an outline, in the project's own hue.
 *
 * Shape and colour carry the identity together, from ONE hash, so the two can
 * never disagree — and the shape survives a monochrome theme, a colour-blind
 * reader and a printout, which is why it is not colour alone. Drawn here rather
 * than taken from the icon set because the categorical hue is a CSS variable and
 * the set's `color` prop takes theme tokens only.
 */
const PATHS = [
  'M8 1.5 14.5 8 8 14.5 1.5 8Z',
  'M8 1.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13Z',
  'M8 1.5 15 14.5H1Z',
  'M2 2h12v12H2Z',
]

const Mark = ({ id }: { id: string }) => (
  <svg width={16} height={16} viewBox="0 0 16 16" fill="none" aria-hidden>
    <path
      d={PATHS[slot(id) % PATHS.length]}
      stroke={mark(id)}
      strokeWidth={1.5}
      strokeLinejoin="round"
    />
  </svg>
)

const Note = ({ children }: { children: string }) => (
  <SizableText px={PAD} py={8} fontSize={rung.small} color="$faint">
    {children}
  </SizableText>
)
