/**
 * THE COMPOSER — the one control in this product that is a pill.
 *
 * It is the one thing the reference's collaboration capture draws in full: a
 * full-width rounded field with a muted placeholder and the send mark at its
 * right end, with no visible border and no label. So the shape is ported and
 * the colour is ours.
 *
 * It grows with what is typed and stops. A field that grows forever pushes the
 * conversation off the top of its own screen, and one that never grows hides
 * the third line of what somebody is about to send.
 *
 * An `@` opening the last word offers the people and bots it could name. A
 * mention only wakes a bot when the name is exact (text.ts `markup`), so the
 * picker is how a bot is reached without spelling it.
 */
import { SizableText, Textarea, XStack, YStack } from '@hanzo/ui'
import { AlertCircle, ArrowUp, Plus, ShieldCheck } from '@hanzogui/lucide-icons-2'
import { useState } from 'react'

import { useHanzoPreferences } from '~/settings/preferences.ts'
import { press } from '~/shell'
import { paint, round, rung } from '~/theme/theme.ts'
import type { Person } from './chat.ts'
import { Face } from './Face.tsx'
import { asking, completed, offered } from './text.ts'

/**
 * A key, as both halves of the prop's type see one.
 *
 * The handler is typed as an INTERSECTION of a DOM handler and a native one, so
 * a handler has to accept either — which means its parameter must be the wider
 * of the two shapes, not either one of them. A DOM event carries all three
 * fields and a native event carries only the first, hence the optionals.
 */
type Key = { nativeEvent: { key: string }; shiftKey?: boolean; preventDefault?: () => void }

/** Keys the picker takes while it is open. */
const PICKER_KEYS = new Set(['ArrowDown', 'ArrowUp', 'Enter', 'Tab', 'Escape'])

/** One line, and the most it will grow to. Image 68 on a marketing crop; here
 *  it is the type's own line box plus the field's padding, so it cannot
 *  disagree with the text inside it. */
const LINE = 22
const PAD = 11
const MIN = LINE + PAD * 2
const MAX = LINE * 8 + PAD * 2

export function Composer({
  placeholder,
  disabled,
  people = [],
  onSend,
}: {
  placeholder: string
  /** Why it cannot be used, said out loud. Absent means it can. */
  disabled?: string
  /** Who a mention can name: the roster, people and bots. */
  people?: readonly Person[]
  onSend: (text: string) => Promise<void>
}) {
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [failed, setFailed] = useState<string | null>(null)
  // The text Escape was pressed on: the picker stays shut until it changes.
  const [shut, setShut] = useState<string | null>(null)
  const [lit, setLit] = useState(0)

  const typing = text === shut ? null : asking(text)
  const choices = typing ? offered(people, typing.query) : []
  const picking = choices.length > 0
  const at = Math.min(lit, Math.max(0, choices.length - 1))

  const choose = (who: Person) => {
    if (!typing) return
    setText(completed(text, typing.at, who))
    setLit(0)
  }

  const edit = (next: string) => {
    setText(next)
    setLit(0)
  }
  const { chat, setChat } = useHanzoPreferences()
  const fullAccess = chat.approvalMode === 'auto'

  const ready = text.trim() !== '' && !sending && !disabled

  const send = async () => {
    if (!ready) return
    const said = text
    setSending(true)
    setFailed(null)
    try {
      await onSend(said)
      // Cleared only on success. A message that failed to send is still the
      // only copy of what somebody wrote, and clearing the field destroys it.
      setText('')
    } catch (e: unknown) {
      setFailed(e instanceof Error ? e.message : String(e))
    } finally {
      setSending(false)
    }
  }

  const lines = Math.min(8, text.split('\n').length)
  const height = Math.max(MIN, Math.min(MAX, lines * LINE + PAD * 2))

  return (
    <YStack px={16} pb={12} pt={6} gap={6}>
      {failed ? (
        <SizableText fontSize="$1" style={{ color: paint.alert }}>
          {failed}
        </SizableText>
      ) : null}

      {picking ? (
        <YStack
          aria-label="Mention somebody"
          py={4}
          rounded={12}
          borderWidth={1}
          borderColor="$edge"
          bg="$panel"
          data-testid="mention-picker"
        >
          {choices.map((who, i) => (
            <XStack
              key={who.id}
              {...press(() => choose(who), `Mention ${who.name}`)}
              px={10}
              py={6}
              mx={4}
              gap={10}
              items="center"
              rounded={8}
              bg={i === at ? '$hover' : 'transparent'}
              hoverStyle={{ background: '$hover' }}
              onMouseEnter={() => setLit(i)}
            >
              <Face person={who} size={22} />
              <SizableText fontSize={rung.body} fontWeight="500" color="$ink" numberOfLines={1} flex={1}>
                {who.name}
              </SizableText>
              {who.bot ? (
                <XStack px={6} py={1} rounded={round.field} borderWidth={1} borderColor="$edge">
                  <SizableText fontSize={rung.chip} color="$quiet">
                    Agent
                  </SizableText>
                </XStack>
              ) : null}
            </XStack>
          ))}
        </YStack>
      ) : null}

      <YStack
        gap={4}
        px={12}
        pt={8}
        pb={8}
        rounded={18}
        borderWidth={1}
        opacity={disabled ? 0.6 : 1}
        style={{
          backgroundColor: paint.composer,
          borderTopColor: paint.composerRule,
          borderRightColor: paint.composerRule,
          borderBottomColor: paint.composerRule,
          borderLeftColor: paint.composerRule,
        }}
        focusWithinStyle={{ borderColor: '$bound' }}
        data-testid="team-composer"
      >
        <Textarea
          flex={1}
          unstyled
          rows={1}
          height={height - 12}
          minH={height - 12}
          maxH={MAX}
          py={4}
          px={2}
          borderWidth={0}
          bg="transparent"
          fontSize="$3"
          lineHeight={LINE}
          color="$ink"
          placeholderTextColor="$placeholderColor"
          placeholder={disabled ?? placeholder}
          value={text}
          disabled={Boolean(disabled)}
          aria-label={placeholder}
          onChangeText={edit}
          onKeyDown={(e: Key) => {
            const key = e.nativeEvent.key
            if (picking && PICKER_KEYS.has(key) && !(key === 'Enter' && e.shiftKey)) {
              e.preventDefault?.()
              if (key === 'ArrowDown') setLit((at + 1) % choices.length)
              else if (key === 'ArrowUp') setLit((at - 1 + choices.length) % choices.length)
              else if (key === 'Escape') setShut(text)
              else choose(choices[at]!)
              return
            }
            if (key !== 'Enter' || e.shiftKey) return
            e.preventDefault?.()
            void send()
          }}
        />

        <XStack items="center" justify="space-between" pt={2}>
          <XStack items="center" gap={6}>
            <YStack
              width={26}
              height={26}
              rounded={13}
              items="center"
              justify="center"
              hoverStyle={{ bg: '$hover' }}
            >
              <Plus size={15} color="$soft" />
            </YStack>

            <XStack
              {...press(
                () => setChat({ approvalMode: fullAccess ? 'manual' : 'auto' }),
                fullAccess ? 'Switch to manual approval' : 'Switch to full access',
              )}
              height={24}
              px={7}
              gap={5}
              rounded={7}
              items="center"
              hoverStyle={{ bg: '$hover' }}
              data-testid="composer-approval-toggle"
            >
              {fullAccess ? (
                <AlertCircle size={13} color={paint.composerWarn} />
              ) : (
                <ShieldCheck size={13} color="$soft" />
              )}
              <SizableText
                fontSize={12}
                fontWeight="500"
                style={{ color: fullAccess ? paint.composerWarn : undefined }}
                color={fullAccess ? undefined : '$soft'}
              >
                {fullAccess ? 'Full access' : 'Manual approval'}
              </SizableText>
            </XStack>
          </XStack>

          <YStack
            aria-disabled={!ready}
            {...press(() => void send(), 'Send')}
            cursor={ready ? 'pointer' : 'default'}
            width={30}
            height={30}
            items="center"
            justify="center"
            rounded={15}
            style={{ backgroundColor: paint.composerAccent }}
            opacity={ready ? 1 : 0.92}
            focusVisibleStyle={{ outlineColor: '$outlineColor', outlineWidth: 2, outlineStyle: 'solid' }}
          >
            <ArrowUp size={16} color={paint.composerAccentInk} />
          </YStack>
        </XStack>
      </YStack>
    </YStack>
  )
}
