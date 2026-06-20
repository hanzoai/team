import { ChatMessage } from '@hanzoteam/chunter'
import { Ref } from '@hanzoteam/core'
import { OnboardingChannel } from '@hanzoteam/analytics-collector'

export interface OnboardingMessage {
  messageId: Ref<ChatMessage>
  channelId: Ref<OnboardingChannel>
}
