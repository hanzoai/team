import { useEffect, useState } from 'react'
import { Button, SizableText, Spinner, XStack, YStack } from '@hanzo/ui'

import { brand } from '~/data/brand.ts'
import { useSession } from '~/data/session.tsx'
import { gap, paint, round, rung } from '~/theme/theme.ts'

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
  const { land, depart } = useSession()
  const [refusal, setRefusal] = useState<string | null>(null)
  const productName = `Hanzo ${brand.title}`

  useEffect(() => {
    document.title = `${refusal ? 'Sign in' : 'Signing you in'} — ${productName}`
  }, [refusal, productName])

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
        justify="space-between"
        borderBottomWidth={1}
        borderColor={paint.rule}
        bg={paint.ground}
      >
        <XStack
          items="center"
          gap={gap.tight}
          cursor="pointer"
          shrink={0}
          onPress={() => window.location.replace('/')}
        >
          <SizableText size={rung.row} color={paint.ink} fontWeight="600">
            {productName}
          </SizableText>
        </XStack>
        <Button
          size="sm"
          variant="outline"
          rounded={round.pill}
          onPress={() => window.location.replace('/')}
        >
          <SizableText size={rung.small} color={paint.ink} fontWeight="500">
            {`← Back to ${productName}`}
          </SizableText>
        </Button>
      </XStack>
      <YStack flex={1} items="center" justify="center" gap={gap.inset} px={gap.wide}>
        {refusal ? (
          <YStack maxW={440} items="center" gap={gap.inset}>
            <SizableText size={rung.title} color={paint.ink} fontWeight="600" style={{ textAlign: 'center' }}>
              Couldn’t finish signing in
            </SizableText>
            <SizableText size={rung.body} color={paint.mute} style={{ textAlign: 'center' }}>
              {refusal}
            </SizableText>
            <XStack items="center" justify="center" gap={gap.tight} flexWrap="wrap" pt={gap.tight}>
              <Button
                rounded={round.pill}
                bg={paint.ink}
                onPress={() => {
                  void depart('login')
                }}
              >
                <SizableText size={rung.small} color={paint.ground} fontWeight="600">
                  Try again
                </SizableText>
              </Button>
              <Button
                variant="outline"
                rounded={round.pill}
                onPress={() => window.location.replace('/')}
              >
                <SizableText size={rung.small} color={paint.ink} fontWeight="500">
                  {`Back to ${productName}`}
                </SizableText>
              </Button>
            </XStack>
          </YStack>
        ) : (
          <YStack items="center" gap={gap.tight}>
            <Spinner />
            <SizableText size={rung.body} color={paint.ink} fontWeight="500">
              {`Signing you in to ${productName}…`}
            </SizableText>
          </YStack>
        )}
      </YStack>
    </YStack>
  )
}
