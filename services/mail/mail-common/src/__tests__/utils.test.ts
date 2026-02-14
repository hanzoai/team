//
// Copyright © 2025 Hanzo AI Inc.
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//
// See the License for the specific language governing permissions and
// limitations under the License.
//

import { getEmailMessageIdFromHanzoId, getHanzoIdFromEmailMessageId, isHanzoEmailMessageId } from '../utils'

describe('Email Message ID Conversion', () => {
  describe('getEmailMessageIdFromHanzoId', () => {
    it('should convert Hanzo ID to email Message-ID format', () => {
      const hanzoId = 'msg_123456789abcdef'
      const email = 'user@example.com'
      const result = getEmailMessageIdFromHanzoId(hanzoId, email)
      expect(result).toBe('<msg_123456789abcdef@example.com>')
    })

    it('should handle different domains', () => {
      const hanzoId = 'hanzo_message_001'
      const email = 'admin@company.org'
      const result = getEmailMessageIdFromHanzoId(hanzoId, email)
      expect(result).toBe('<hanzo_message_001@company.org>')
    })

    it('should handle subdomain emails', () => {
      const hanzoId = 'test_msg'
      const email = 'support@mail.example.com'
      const result = getEmailMessageIdFromHanzoId(hanzoId, email)
      expect(result).toBe('<test_msg@mail.example.com>')
    })

    it('should handle complex Hanzo IDs', () => {
      const hanzoId = 'channel_123_thread_456_msg_789'
      const email = 'team@startup.io'
      const result = getEmailMessageIdFromHanzoId(hanzoId, email)
      expect(result).toBe('<channel_123_thread_456_msg_789@startup.io>')
    })

    it('should throw error for invalid email', () => {
      const hanzoId = 'msg_123'
      const invalidEmail = 'not-an-email'
      expect(() => getEmailMessageIdFromHanzoId(hanzoId, invalidEmail)).toThrow('Invalid email address')
    })
  })

  describe('getHanzoIdFromEmailMessageId', () => {
    it('should extract Hanzo ID from email Message-ID', () => {
      const messageId = '<msg_123456789abcdef@example.com>'
      const email = 'user@example.com'
      const result = getHanzoIdFromEmailMessageId(messageId, email)
      expect(result).toBe('msg_123456789abcdef')
    })

    it('should handle Message-ID without angle brackets', () => {
      const messageId = 'msg_123456789abcdef@example.com'
      const email = 'user@example.com'
      const result = getHanzoIdFromEmailMessageId(messageId, email)
      expect(result).toBe('msg_123456789abcdef')
    })

    it('should return undefined for non-matching domain', () => {
      const messageId = '<msg_123@example.com>'
      const email = 'user@different.com'
      const result = getHanzoIdFromEmailMessageId(messageId, email)
      expect(result).toBeUndefined()
    })

    it('should handle complex domains', () => {
      const messageId = '<channel_123_thread_456@mail.company.org>'
      const email = 'admin@mail.company.org'
      const result = getHanzoIdFromEmailMessageId(messageId, email)
      expect(result).toBe('channel_123_thread_456')
    })

    it('should handle empty Hanzo ID part', () => {
      const messageId = '<@example.com>'
      const email = 'user@example.com'
      const result = getHanzoIdFromEmailMessageId(messageId, email)
      expect(result).toBe('')
    })

    it('should return undefined for standard email Message-IDs', () => {
      const messageId = '<CABc1234567890abcdef@mail.gmail.com>'
      const email = 'user@example.com'
      const result = getHanzoIdFromEmailMessageId(messageId, email)
      expect(result).toBeUndefined()
    })

    it('should handle multiple @ symbols in Message-ID', () => {
      const messageId = '<msg@test@example.com>'
      const email = 'user@example.com'
      const result = getHanzoIdFromEmailMessageId(messageId, email)
      expect(result).toBe('msg@test')
    })

    it('should throw error for invalid email', () => {
      const messageId = '<msg_123@example.com>'
      const invalidEmail = 'not-an-email'
      expect(() => getHanzoIdFromEmailMessageId(messageId, invalidEmail)).toThrow('Invalid email address')
    })
  })

  describe('isHanzoEmailMessageId', () => {
    it('should return true for valid Hanzo Message-ID', () => {
      const messageId = '<msg_123456789abcdef@example.com>'
      const email = 'user@example.com'
      const result = isHanzoEmailMessageId(messageId, email)
      expect(result).toBe(true)
    })

    it('should return false for non-matching domain', () => {
      const messageId = '<msg_123@example.com>'
      const email = 'user@different.com'
      const result = isHanzoEmailMessageId(messageId, email)
      expect(result).toBe(false)
    })

    it('should return false for standard email Message-IDs', () => {
      const messageId = '<CABc1234567890abcdef@mail.gmail.com>'
      const email = 'user@example.com'
      const result = isHanzoEmailMessageId(messageId, email)
      expect(result).toBe(false)
    })

    it('should return true for Message-ID without angle brackets', () => {
      const messageId = 'msg_123456789abcdef@example.com'
      const email = 'user@example.com'
      const result = isHanzoEmailMessageId(messageId, email)
      expect(result).toBe(true)
    })
  })

  describe('Round-trip conversion', () => {
    it('should preserve Hanzo ID through round-trip conversion', () => {
      const originalHanzoId = 'msg_123456789abcdef'
      const email = 'user@example.com'

      const messageId = getEmailMessageIdFromHanzoId(originalHanzoId, email)
      const extractedHanzoId = getHanzoIdFromEmailMessageId(messageId, email)

      expect(extractedHanzoId).toBe(originalHanzoId)
    })

    it('should work with complex Hanzo IDs', () => {
      const originalHanzoId = 'channel_abc123_thread_def456_msg_789xyz'
      const email = 'team@company.com'

      const messageId = getEmailMessageIdFromHanzoId(originalHanzoId, email)
      const extractedHanzoId = getHanzoIdFromEmailMessageId(messageId, email)

      expect(extractedHanzoId).toBe(originalHanzoId)
    })

    it('should work with subdomain emails', () => {
      const originalHanzoId = 'notification_001'
      const email = 'alerts@mail.platform.io'

      const messageId = getEmailMessageIdFromHanzoId(originalHanzoId, email)
      const extractedHanzoId = getHanzoIdFromEmailMessageId(messageId, email)

      expect(extractedHanzoId).toBe(originalHanzoId)
    })
  })

  describe('Edge cases', () => {
    it('should handle Hanzo ID with special characters', () => {
      const hanzoId = 'msg-123_test.001'
      const email = 'user@example.com'

      const messageId = getEmailMessageIdFromHanzoId(hanzoId, email)
      expect(messageId).toBe('<msg-123_test.001@example.com>')

      const extractedHanzoId = getHanzoIdFromEmailMessageId(messageId, email)
      expect(extractedHanzoId).toBe(hanzoId)
    })

    it('should handle very long Hanzo IDs', () => {
      const hanzoId = 'very_long_hanzo_id_with_many_segments_and_characters_123456789abcdef'
      const email = 'user@example.com'

      const messageId = getEmailMessageIdFromHanzoId(hanzoId, email)
      const extractedHanzoId = getHanzoIdFromEmailMessageId(messageId, email)

      expect(extractedHanzoId).toBe(hanzoId)
    })

    it('should handle empty Hanzo ID', () => {
      const hanzoId = ''
      const email = 'user@example.com'

      const messageId = getEmailMessageIdFromHanzoId(hanzoId, email)
      expect(messageId).toBe('<@example.com>')

      const extractedHanzoId = getHanzoIdFromEmailMessageId(messageId, email)
      expect(extractedHanzoId).toBe('')
    })
  })
})
