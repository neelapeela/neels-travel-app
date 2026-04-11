import { describe, expect, it } from 'vitest'
import {
  getTicketLinkLabel,
  getTicketsFromStop,
  normalizeTicketLinkTitle,
  normalizeTicketLinkUrl
} from '../../src/utils/ticketAttachments'

describe('ticketAttachments', () => {
  describe('normalizeTicketLinkUrl', () => {
    it('returns null for empty', () => {
      expect(normalizeTicketLinkUrl('')).toBeNull()
      expect(normalizeTicketLinkUrl('   ')).toBeNull()
    })

    it('keeps https URLs', () => {
      expect(normalizeTicketLinkUrl('https://example.com/path')).toBe('https://example.com/path')
    })

    it('prepends https when scheme missing', () => {
      expect(normalizeTicketLinkUrl('example.com/tickets')).toBe('https://example.com/tickets')
    })

    it('returns null for invalid', () => {
      expect(normalizeTicketLinkUrl('not a url at all !!!')).toBeNull()
    })
  })

  describe('getTicketsFromStop', () => {
    it('returns empty arrays when missing', () => {
      expect(getTicketsFromStop(null)).toEqual({ photos: [], links: [] })
      expect(getTicketsFromStop({})).toEqual({ photos: [], links: [] })
    })

    it('reads metadata.tickets', () => {
      const stop = {
        metadata: {
          tickets: {
            photos: [{ id: '1', url: 'https://x.com/a.jpg' }],
            links: [{ id: '2', url: 'https://confirm.example' }]
          }
        }
      }
      expect(getTicketsFromStop(stop).photos).toHaveLength(1)
      expect(getTicketsFromStop(stop).links).toHaveLength(1)
    })
  })

  describe('normalizeTicketLinkTitle', () => {
    it('returns undefined for empty', () => {
      expect(normalizeTicketLinkTitle('')).toBeUndefined()
      expect(normalizeTicketLinkTitle('  ')).toBeUndefined()
    })

    it('trims and caps length', () => {
      expect(normalizeTicketLinkTitle('  My ticket  ')).toBe('My ticket')
      const long = 'x'.repeat(200)
      expect(normalizeTicketLinkTitle(long)?.length).toBe(120)
    })
  })

  describe('getTicketLinkLabel', () => {
    it('prefers title then label then url', () => {
      expect(getTicketLinkLabel({ url: 'https://a.com', title: 'Boarding pass' })).toBe('Boarding pass')
      expect(getTicketLinkLabel({ url: 'https://a.com', label: 'Legacy' })).toBe('Legacy')
      expect(getTicketLinkLabel({ url: 'https://a.com' })).toBe('https://a.com')
    })
  })
})
