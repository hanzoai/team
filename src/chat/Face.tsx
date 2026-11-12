/** A person's face: their avatar when the server has one, else their initial. */
import { SizableText, YStack } from '@hanzo/ui'

import { round } from '~/theme/theme'
import type { Person } from './chat.ts'

export const Face = ({ person, size }: { person: Pick<Person, 'name' | 'avatar'>; size: number }) => (
  <YStack
    width={size}
    height={size}
    rounded={round.pill}
    overflow="hidden"
    bg="$panel"
    borderWidth={1}
    borderColor="$edge"
    items="center"
    justify="center"
    shrink={0}
  >
    {person.avatar ? (
      <img
        src={person.avatar}
        alt={person.name}
        width={size}
        height={size}
        style={{ width: size, height: size, objectFit: 'cover', display: 'block' }}
      />
    ) : (
      <SizableText fontSize={Math.max(10, size * 0.42)} fontWeight="600" color="$quiet">
        {person.name.slice(0, 1).toUpperCase()}
      </SizableText>
    )}
  </YStack>
)
