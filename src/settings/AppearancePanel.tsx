import { Box, SizableText, Text, XStack, YStack } from '@hanzo/ui'
import { Check, Moon, Monitor, Sun } from 'lucide-react'

import { paint } from '~/theme/theme.ts'
import { setRightPaneDefaultOpen } from '~/workspace/store.ts'
import {
  DEFAULT_TEAM_SETTINGS,
  MAX_APPEARANCE_CONTRAST,
  MAX_FONT_SIZE_PX,
  MAX_PANEL_ANIMATION_MS,
  MAX_SURFACE_SOLIDNESS,
  MIN_APPEARANCE_CONTRAST,
  MIN_FONT_SIZE_PX,
  MIN_PANEL_ANIMATION_MS,
  MIN_SURFACE_SOLIDNESS,
  useTeamSettings,
  type HanzoThemePreference,
  type TeamChatWidth,
  type TeamCodeFont,
  type TeamDockIconMode,
  type TeamMessageDensity,
  type TeamRightPaneDefault,
  type TeamSidebarWidth,
  type TeamThemePreset,
  type TeamUiFont,
} from './preferences.ts'
import {
  getTauriInvoke,
  SegmentedChoice,
  SettingsRow,
  SettingsSectionCard,
  SettingsSelect,
  SettingsSlider,
} from './settingsPrimitives.tsx'

type ThemeCardSpec = {
  id: TeamThemePreset
  label: string
  subtitle: string
  chrome: string
  stage: string
  sidebar: string
  card: string
  accent: string
  line: string
}

const THEME_LIBRARY_CARDS: readonly ThemeCardSpec[] = [
  {
    id: 'zen',
    label: 'Zen',
    subtitle: 'Obsidian chrome · crisp 1px borders',
    chrome: 'var(--preview-zen-chrome)',
    stage: 'var(--preview-zen-stage)',
    sidebar: 'var(--preview-zen-sidebar)',
    card: 'var(--preview-zen-card)',
    accent: 'var(--preview-zen-accent)',
    line: 'var(--preview-zen-line)',
  },
  {
    id: 'clay',
    label: 'Clay',
    subtitle: 'Warm slate · crimson accent',
    chrome: 'var(--preview-clay-chrome)',
    stage: 'var(--preview-clay-stage)',
    sidebar: 'var(--preview-clay-sidebar)',
    card: 'var(--preview-clay-card)',
    accent: 'var(--preview-clay-accent)',
    line: 'var(--preview-clay-line)',
  },
  {
    id: 'zen-light',
    label: 'Zen Light',
    subtitle: 'Daylight paper · zinc ink',
    chrome: 'var(--preview-light-chrome)',
    stage: 'var(--preview-light-stage)',
    sidebar: 'var(--preview-light-sidebar)',
    card: 'var(--preview-light-card)',
    accent: 'var(--preview-light-accent)',
    line: 'var(--preview-light-line)',
  },
]

function ThemeMiniWireframe({ spec }: { spec: ThemeCardSpec }) {
  return (
    <div
      aria-hidden="true"
      style={{
        position: 'relative',
        width: '100%',
        height: 84,
        borderRadius: 8,
        overflow: 'hidden',
        backgroundColor: spec.stage,
        border: `1px solid ${spec.line}`,
      }}
    >
      {/* Top 38px-proportional chrome bar */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 12,
          backgroundColor: spec.chrome,
          borderBottom: `1px solid ${spec.line}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            width: '34%',
            height: 5,
            borderRadius: 3,
            backgroundColor: spec.card,
            border: `1px solid ${spec.line}`,
          }}
        />
      </div>

      {/* Guild rail */}
      <div
        style={{
          position: 'absolute',
          top: 12,
          bottom: 0,
          left: 0,
          width: '9%',
          backgroundColor: spec.chrome,
          borderRight: `1px solid ${spec.line}`,
        }}
      />

      {/* Channel sidebar */}
      <div
        style={{
          position: 'absolute',
          top: 12,
          bottom: 0,
          left: '9%',
          width: '21%',
          backgroundColor: spec.sidebar,
          borderRight: `1px solid ${spec.line}`,
          padding: 5,
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
        }}
      >
        <div style={{ height: 5, width: '76%', borderRadius: 2, backgroundColor: spec.card }} />
        <div style={{ height: 5, width: '88%', borderRadius: 2, backgroundColor: spec.line }} />
        <div style={{ height: 5, width: '64%', borderRadius: 2, backgroundColor: spec.card }} />
      </div>

      {/* Main stage cards & composer */}
      <div
        style={{
          position: 'absolute',
          top: 17,
          left: '34%',
          right: '24%',
          height: 22,
          borderRadius: 5,
          backgroundColor: spec.card,
          border: `1px solid ${spec.line}`,
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: 6,
          left: '34%',
          right: '24%',
          height: 15,
          borderRadius: 5,
          backgroundColor: spec.card,
          border: `1px solid ${spec.line}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          padding: '0 4px',
        }}
      >
        <div
          style={{
            width: 8,
            height: 8,
            borderRadius: 999,
            backgroundColor: spec.accent,
          }}
        />
      </div>

      {/* Right Thread / Roster pane */}
      <div
        style={{
          position: 'absolute',
          top: 12,
          bottom: 0,
          right: 0,
          width: '20%',
          backgroundColor: spec.sidebar,
          borderLeft: `1px solid ${spec.line}`,
        }}
      />
    </div>
  )
}

export function AppearancePanel() {
  const { settings, updateSettings, resetSetting } = useTeamSettings()
  const d = DEFAULT_TEAM_SETTINGS

  const fontSizeOptions = Array.from(
    { length: MAX_FONT_SIZE_PX - MIN_FONT_SIZE_PX + 1 },
    (_, idx) => {
      const px = MIN_FONT_SIZE_PX + idx
      return { id: String(px), label: `${px} px${px === d.fontSizePx ? ' (default)' : ''}` }
    },
  )

  return (
    <YStack gap={22} width="100%" data-testid="settings-appearance-panel">
      {/* 1. Theme Library + Color Mode (Hanzo Dev Colors & Themes) */}
      <SettingsSectionCard
        title="Colors & Themes"
        description="Choose a built-in Hanzo theme palette and appearance mode across all workspace panes."
        headerRight={
          <XStack
            p={3}
            gap={2}
            rounded={8}
            borderWidth={1}
            style={{
              backgroundColor: paint.settingsControl,
              borderColor: paint.settingsBorder,
            }}
          >
            {(
              [
                { id: 'dark' as const, label: 'Dark', Icon: Moon },
                { id: 'light' as const, label: 'Light', Icon: Sun },
                { id: 'system' as const, label: 'System', Icon: Monitor },
              ] satisfies readonly { id: HanzoThemePreference; label: string; Icon: typeof Moon }[]
            ).map(({ id, label, Icon }) => {
              const active = settings.colorMode === id
              return (
                <Box
                  key={id}
                  render={<button type="button" aria-pressed={active} />}
                  onClick={() => updateSettings({ colorMode: id })}
                  px={9}
                  py={4}
                  rounded={6}
                  cursor="pointer"
                  style={{
                    backgroundColor: active ? paint.settingsRowActive : 'transparent',
                    border: active ? `1px solid ${paint.settingsBorder}` : '1px solid transparent',
                  }}
                >
                  <XStack items="center" gap={5}>
                    <Icon size={11.5} color={active ? paint.ink : paint.mute} />
                    <Text fontSize={11.5} fontWeight={active ? '600' : '500'} style={{ color: active ? paint.ink : paint.mute }}>
                      {label}
                    </Text>
                  </XStack>
                </Box>
              )
            })}
          </XStack>
        }
        plain
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
            gap: 10,
          }}
        >
          {THEME_LIBRARY_CARDS.map((card) => {
            const active = settings.themePreset === card.id
            return (
              <Box
                key={card.id}
                render={<button type="button" aria-pressed={active} data-testid={`theme-card-${card.id}`} />}
                onClick={() => updateSettings({ themePreset: card.id })}
                p={12}
                rounded={14}
                cursor="pointer"
                style={{
                  textAlign: 'left',
                  backgroundColor: paint.settingsCard,
                  border: active
                    ? `1.5px solid ${paint.accent}`
                    : `1px solid ${paint.settingsBorder}`,
                  transition: 'border-color 120ms ease',
                }}
              >
                <YStack gap={8}>
                  <ThemeMiniWireframe spec={card} />
                  <YStack gap={2} minW={0}>
                    <XStack items="center" justify="space-between" gap={6}>
                      <XStack items="center" gap={5} minW={0}>
                        <SizableText fontSize={13} fontWeight="600" style={{ color: paint.ink }}>
                          {card.label}
                        </SizableText>
                        {active ? <Check size={12} color={paint.accent} /> : null}
                      </XStack>
                      <XStack items="center" gap={3} shrink={0}>
                        {[card.chrome, card.sidebar, card.card, card.accent].map((sw, idx) => (
                          <Box
                            key={idx}
                            width={9}
                            height={9}
                            rounded={999}
                            style={{
                              backgroundColor: sw,
                              border: `1px solid ${paint.settingsBorder}`,
                            }}
                          />
                        ))}
                      </XStack>
                    </XStack>
                    <SizableText fontSize={11} style={{ color: paint.dim }} numberOfLines={1}>
                      {card.subtitle}
                    </SizableText>
                  </YStack>
                </YStack>
              </Box>
            )
          })}
        </div>
      </SettingsSectionCard>

      {/* 2. Channel Density, Width & Pane Layout */}
      <SettingsSectionCard
        title="Layout & Channel Density"
        description="Control message stream spacing, maximum chat width, and sidebar geometry."
      >
        <SettingsRow
          title="Channel message density"
          description="Cozy groups avatars and full headers like Discord; Compact tightens vertical spacing like Mattermost."
          modified={settings.messageDensity !== d.messageDensity}
          onReset={() => resetSetting('messageDensity')}
          control={
            <SegmentedChoice<TeamMessageDensity>
              value={settings.messageDensity}
              options={[
                { id: 'cozy', label: 'Cozy (Discord)' },
                { id: 'compact', label: 'Compact (Mattermost)' },
              ]}
              onChange={(messageDensity) => updateSettings({ messageDensity })}
            />
          }
        />

        <SettingsRow
          title="Content / chat width"
          description="Set how wide channel messages and the composer grow on large displays."
          modified={settings.chatWidth !== d.chatWidth}
          onReset={() => resetSetting('chatWidth')}
          control={
            <SegmentedChoice<TeamChatWidth>
              value={settings.chatWidth}
              options={[
                { id: 'comfortable', label: 'Comfortable' },
                { id: 'wide', label: 'Wide' },
                { id: 'full', label: 'Full' },
              ]}
              onChange={(chatWidth) => updateSettings({ chatWidth })}
            />
          }
        />

        <SettingsRow
          title="Left channel sidebar width"
          description="Resize the unified workspaces, channels, and voice huddles column."
          modified={settings.sidebarWidth !== d.sidebarWidth}
          onReset={() => resetSetting('sidebarWidth')}
          control={
            <SegmentedChoice<TeamSidebarWidth>
              value={settings.sidebarWidth}
              options={[
                { id: 'compact', label: 'Compact 216px' },
                { id: 'default', label: 'Default 248px' },
                { id: 'wide', label: 'Wide 288px' },
              ]}
              onChange={(sidebarWidth) => updateSettings({ sidebarWidth })}
            />
          }
        />

        <SettingsRow
          last
          title="Right Thread / Roster pane default"
          description="Open the right contextual Thread & Workforce pane on launch or keep it collapsed."
          modified={settings.rightPaneDefault !== d.rightPaneDefault}
          onReset={() => {
            resetSetting('rightPaneDefault')
            setRightPaneDefaultOpen(true)
          }}
          control={
            <SegmentedChoice<TeamRightPaneDefault>
              value={settings.rightPaneDefault}
              options={[
                { id: 'open', label: 'Open' },
                { id: 'collapsed', label: 'Collapsed' },
              ]}
              onChange={(rightPaneDefault) => {
                updateSettings({ rightPaneDefault })
                setRightPaneDefaultOpen(rightPaneDefault === 'open')
              }}
            />
          }
        />
      </SettingsSectionCard>

      {/* 3. Interface Contrast, Solidness, Animations & Dock Icon */}
      <SettingsSectionCard
        title="Interface & Motion"
        description="Fine-tune surface contrast, backdrop solidness, panel transitions, and Dock icon."
      >
        <SettingsRow
          title="Interface contrast"
          description="Adjust overall contrast of borders, cards, and foreground hierarchy (75%–125%)."
          modified={settings.appearanceContrast !== d.appearanceContrast}
          onReset={() => resetSetting('appearanceContrast')}
          control={
            <SettingsSlider
              id="team-appearance-contrast"
              label="Interface contrast"
              value={settings.appearanceContrast}
              min={MIN_APPEARANCE_CONTRAST}
              max={MAX_APPEARANCE_CONTRAST}
              step={5}
              unit="%"
              onChange={(appearanceContrast) => updateSettings({ appearanceContrast })}
            />
          }
        />

        <SettingsRow
          title="Surface solidness"
          description="Higher values make dialogs, menus, and floating bars more opaque (70%–100%)."
          modified={settings.surfaceSolidness !== d.surfaceSolidness}
          onReset={() => resetSetting('surfaceSolidness')}
          control={
            <SettingsSlider
              id="team-surface-solidness"
              label="Surface solidness"
              value={settings.surfaceSolidness}
              min={MIN_SURFACE_SOLIDNESS}
              max={MAX_SURFACE_SOLIDNESS}
              step={5}
              unit="%"
              onChange={(surfaceSolidness) => updateSettings({ surfaceSolidness })}
            />
          }
        />

        <SettingsRow
          title="Panel animations"
          description="Set transition speed when sidebars, drawers, and popovers open or close (0ms–250ms)."
          modified={settings.panelAnimationMs !== d.panelAnimationMs}
          onReset={() => resetSetting('panelAnimationMs')}
          control={
            <SettingsSlider
              id="team-panel-animations"
              label="Panel animation duration"
              value={settings.panelAnimationMs}
              min={MIN_PANEL_ANIMATION_MS}
              max={MAX_PANEL_ANIMATION_MS}
              step={25}
              unit=" ms"
              onChange={(panelAnimationMs) => updateSettings({ panelAnimationMs })}
            />
          }
        />

        <SettingsRow
          last
          title="Dock icon"
          description="Choose between the branded obsidian squircle and minimal monochrome Dock icon."
          modified={settings.dockIcon !== d.dockIcon}
          onReset={() => {
            resetSetting('dockIcon')
            void getTauriInvoke()?.('set_dock_icon_mode', { mode: 'branded' })
          }}
          control={
            <SegmentedChoice<TeamDockIconMode>
              value={settings.dockIcon}
              options={[
                { id: 'branded', label: 'Branded' },
                { id: 'minimal', label: 'Minimal' },
              ]}
              onChange={(dockIcon) => {
                updateSettings({ dockIcon })
                void getTauriInvoke()?.('set_dock_icon_mode', { mode: dockIcon })
              }}
            />
          }
        />
      </SettingsSectionCard>

      {/* 4. Typography (Zen UI & Zen Mono + 12px-16px scale) */}
      <SettingsSectionCard
        title="Typography"
        description="Configure interface sans-serif, code monospace font, and base typography scale."
      >
        <SettingsRow
          title="Interface font & size"
          description="Used across channels, issue boards, Spaces, and Virtual HQ."
          modified={settings.uiFont !== d.uiFont || settings.fontSizePx !== d.fontSizePx}
          onReset={() => updateSettings({ uiFont: d.uiFont, fontSizePx: d.fontSizePx })}
          control={
            <XStack items="center" gap={8}>
              <SettingsSelect<TeamUiFont>
                label="Interface font"
                value={settings.uiFont}
                options={[
                  { id: 'Zen', label: 'Zen (default)' },
                  { id: 'Inter', label: 'Inter' },
                  { id: 'System', label: 'System UI' },
                ]}
                onChange={(uiFont) => updateSettings({ uiFont })}
              />
              <SettingsSelect<string>
                label="Font size"
                value={String(settings.fontSizePx)}
                options={fontSizeOptions}
                onChange={(v) => updateSettings({ fontSizePx: Number(v) })}
              />
            </XStack>
          }
        />

        <SettingsRow
          last
          title="Monospace code font"
          description="Used in diff blocks, slash commands, YAML objectives, and terminal snippets."
          modified={settings.codeFont !== d.codeFont}
          onReset={() => resetSetting('codeFont')}
          control={
            <SettingsSelect<TeamCodeFont>
              label="Monospace font"
              value={settings.codeFont}
              options={[
                { id: 'Zen Mono', label: 'Zen Mono (default)' },
                { id: 'JetBrains Mono', label: 'JetBrains Mono' },
                { id: 'System Mono', label: 'System Monospace' },
              ]}
              onChange={(codeFont) => updateSettings({ codeFont })}
            />
          }
        >
          <XStack
            px={12}
            py={8}
            rounded={8}
            borderWidth={1}
            items="center"
            justify="space-between"
            style={{
              backgroundColor: paint.settingsControl,
              borderColor: paint.settingsBorder,
            }}
          >
            <Text fontSize={12} style={{ color: paint.fg, fontFamily: 'var(--font-mono)' }}>
              {`const route = (turn: Turn) => turn.code ? "zen6-coder" : "enso" // 14ms`}
            </Text>
            <Text fontSize={10.5} style={{ color: paint.dim, fontFamily: 'var(--font-mono)' }}>
              {`${settings.codeFont} · ${settings.fontSizePx}px`}
            </Text>
          </XStack>
        </SettingsRow>
      </SettingsSectionCard>
    </YStack>
  )
}
