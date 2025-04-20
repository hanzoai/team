import { ChatMessage } from '@hanzo/chunter'
import { Ref } from '@hanzo/core'
import { OnboardingChannel } from '@hanzo/analytics-collector'

export interface OnboardingMessage {
  messageId: Ref<ChatMessage>
  channelId: Ref<OnboardingChannel>
}
