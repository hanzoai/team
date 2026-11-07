/**
 * What the chat surface publishes.
 *
 * Two components and nothing else: the navigator column and the screen. Every
 * other module here is the inside of one of them, and a second region reaching
 * past this file would be reaching into a decision it does not own.
 */
export { AgentPane } from './AgentPane.tsx'
export { Chat } from './Chat.tsx'
export { Channels } from './Channels.tsx'
