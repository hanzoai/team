import { useEffect, useState } from 'react'
import { SizableText, Spinner, XStack, YStack } from '@hanzo/ui'

import { brand } from '~/data/brand.ts'
import { useSession } from '~/data/session.tsx'
import { gap, paint, rung } from '~/theme/theme.ts'

/**
 * Where the issuer returns a browser that signed in the other way.
 *
 * It renders before this browser knows who it is, which is why it is a route
 * of its own: `<Session>` stands down on this path so the ordinary signed-out
 * path does not navigate away from a code that is being redeemed.
 *
 * The landing is a full page navigation rather than a router push, because the
 * URL still carries `code` and `state` — leaving them in the address bar means
 * a reload replays a code the issuer has already spent, which fails and reads
 * as a broken sign-in.
 */
export const Callback = () => {
  const { land } = useSession()
  const [refusal, setRefusal] = useState<string | null>(null)

  useEffect(() => {
    void land()
      .then((where) => window.location.replace(where))
      .catch((e: unknown) => setRefusal(e instanceof Error ? e.message : String(e)))
  }, [land])

  return (
    <YStack flex={1} minH="100vh" bg={paint.ground}>
      <XStack
        width="100%"
        minH={68}
        px={gap.wide}
        py={gap.tight}
        items="center"
        borderBottomWidth={1}
        borderColor={paint.rule}
        bg={paint.ground}
      >
        <XStack
          items="center"
          gap={gap.tight}
          cursor="pointer"
          shrink={0}
          onPress={() => window.location.assign('/')}
        >
          <SizableText size={rung.row} color={paint.ink} fontWeight="600">
            {`Hanzo ${brand.title}`}
          </SizableText>
        </XStack>
      </XStack>
      <YStack flex={1} items="center" justify="center" gap={gap.inset}>
        {refusal ? (
          <>
            <SizableText size={rung.body} color={paint.alert}>
              {refusal}
            </SizableText>
            <SizableText
              size={rung.small}
              color={paint.mute}
              cursor="pointer"
              onPress={() => window.location.replace('/login')}
            >
              Try again
            </SizableText>
          </>
        ) : (
          <Spinner />
        )}
      </YStack>
    </YStack>
  )
}
