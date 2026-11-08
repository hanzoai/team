import { useState } from 'react'
import { Button, Input, SizableText, Spinner, XStack, YStack } from '@hanzo/ui'

import { brand } from '~/data/brand.ts'
import { useSession } from '~/data/session.tsx'
import { gap, paint, round, rung } from '~/theme/theme.ts'

/**
 * The way in, on this app's own page.
 *
 * Every method here is @hanzo/iam's. There is no password check, no session of
 * our own and no second gate — the credential goes to the issuer's login
 * endpoint, which answers with a PKCE-BOUND authorization code, and the token
 * exchange that follows is the ordinary RFC 7636 one. Nothing this app writes
 * ever sees a password after the field it was typed into.
 *
 * The window does not leave. That matters more than it sounds: a redirect in
 * the middle of a workspace loses whatever was open, and an issuer's own page
 * is a second product's chrome in the middle of this one. The redirect remains
 * as the second door, because an embedded endpoint that is unreachable has to
 * fail towards the way in that always works rather than towards a dead form.
 */
export const Login = () => {
  const { standing, enter, post, confirm, depart } = useSession()
  const [name, setName] = useState('')
  const [secret, setSecret] = useState('')
  const [code, setCode] = useState('')
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [refusal, setRefusal] = useState<string | null>(null)

  if (standing === 'in') return null

  const attempt = (work: () => Promise<void>) => {
    setRefusal(null)
    setBusy(true)
    void work()
      .catch((e: unknown) => setRefusal(e instanceof Error ? e.message : String(e)))
      .finally(() => setBusy(false))
  }

  return (
    <YStack flex={1} items="center" justify="center" bg={paint.ground} p={gap.wide}>
      <YStack width={360} gap={gap.inset}>
        <SizableText size={rung.title} color={paint.ink}>
          {brand.title}
        </SizableText>
        <SizableText size={rung.body} color={paint.mute}>
          Sign in to your workspace.
        </SizableText>

        <YStack gap={gap.tight} mt={gap.inset}>
          <Input
            value={name}
            onChangeText={setName}
            placeholder="Email"
            autoComplete="username"
            rounded={round.field}
          />
          {sent ? (
            <Input
              value={code}
              onChangeText={setCode}
              placeholder="The code we sent you"
              autoComplete="one-time-code"
              rounded={round.field}
            />
          ) : (
            <Input
              value={secret}
              onChangeText={setSecret}
              placeholder="Password"
              secureTextEntry
              autoComplete="current-password"
              rounded={round.field}
            />
          )}
        </YStack>

        {refusal ? (
          <SizableText size={rung.small} color={paint.alert}>
            {refusal}
          </SizableText>
        ) : null}

        <Button
          disabled={busy || !name}
          onPress={() =>
            attempt(() => (sent ? confirm(name, code) : enter(name, secret)))
          }
        >
          {busy ? <Spinner /> : sent ? 'Sign in' : 'Continue'}
        </Button>

        <XStack gap={gap.tight} justify="space-between">
          <Button
            chromeless
            disabled={busy || !name}
            onPress={() =>
              attempt(async () => {
                await post(name)
                setSent(true)
              })
            }
          >
            <SizableText size={rung.small} color={paint.mute}>
              Email me a code
            </SizableText>
          </Button>
          <Button chromeless onPress={depart}>
            <SizableText size={rung.small} color={paint.mute}>
              Sign in at {new URL(brand.issuer).hostname}
            </SizableText>
          </Button>
        </XStack>
      </YStack>
    </YStack>
  )
}
