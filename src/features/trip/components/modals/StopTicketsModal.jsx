import { useEffect, useRef, useState } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { updateStopInTrip } from '../../../../api/trip'
import { isCloudinaryConfigured, uploadTicketScreenshot } from '../../../../utils/cloudinaryUpload'
import {
  getTicketLinkLabel,
  getTicketsFromStop,
  normalizeTicketLinkTitle,
  normalizeTicketLinkUrl
} from '../../../../utils/ticketAttachments'

export default function StopTicketsModal({
  tripId,
  date,
  stop,
  stopTitle,
  onClose,
  savesDisabled = false
}) {
  const fileInputRef = useRef(null)
  const [linkTitleDraft, setLinkTitleDraft] = useState('')
  const [linkDraft, setLinkDraft] = useState('')
  const [uploading, setUploading] = useState(false)
  const [savingLink, setSavingLink] = useState(false)
  const [error, setError] = useState('')

  const { photos, links } = getTicketsFromStop(stop)
  const cloudinaryReady = isCloudinaryConfigured()

  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== 'Escape') return
      e.preventDefault()
      e.stopPropagation()
      onClose()
    }
    window.addEventListener('keydown', onKey, { capture: true })
    return () => window.removeEventListener('keydown', onKey, { capture: true })
  }, [onClose])

  const persistTickets = async (nextPhotos, nextLinks) => {
    if (!tripId || !date || !stop?.id) throw new Error('Missing trip or stop.')
    const prevMeta = stop.metadata && typeof stop.metadata === 'object' ? { ...stop.metadata } : {}
    await updateStopInTrip(tripId, date, stop.id, {
      metadata: {
        ...prevMeta,
        tickets: { photos: nextPhotos, links: nextLinks }
      }
    })
  }

  const handlePickPhoto = () => {
    setError('')
    fileInputRef.current?.click()
  }

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || savesDisabled) return
    setError('')
    setUploading(true)
    try {
      const { url, publicId } = await uploadTicketScreenshot(file)
      const nextPhotos = [
        ...photos,
        {
          id: uuidv4(),
          url,
          publicId: publicId || undefined,
          createdAt: new Date().toISOString()
        }
      ]
      await persistTickets(nextPhotos, links)
    } catch (err) {
      console.error(err)
      setError(err?.message || 'Could not upload image.')
    } finally {
      setUploading(false)
    }
  }

  const handleRemovePhoto = async (id) => {
    if (savesDisabled) return
    setError('')
    try {
      await persistTickets(
        photos.filter((p) => p.id !== id),
        links
      )
    } catch (err) {
      console.error(err)
      setError(err?.message || 'Could not remove photo.')
    }
  }

  const handleAddLink = async () => {
    if (savesDisabled) return
    const url = normalizeTicketLinkUrl(linkDraft)
    if (!url) {
      setError('Enter a valid link (e.g. example.com or https://…).')
      return
    }
    setError('')
    setSavingLink(true)
    try {
      const title = normalizeTicketLinkTitle(linkTitleDraft)
      const nextLinks = [
        ...links,
        {
          id: uuidv4(),
          url,
          ...(title ? { title } : {}),
          createdAt: new Date().toISOString()
        }
      ]
      await persistTickets(photos, nextLinks)
      setLinkDraft('')
      setLinkTitleDraft('')
    } catch (err) {
      console.error(err)
      setError(err?.message || 'Could not save link.')
    } finally {
      setSavingLink(false)
    }
  }

  const handleRemoveLink = async (id) => {
    if (savesDisabled) return
    setError('')
    try {
      await persistTickets(
        photos,
        links.filter((l) => l.id !== id)
      )
    } catch (err) {
      console.error(err)
      setError(err?.message || 'Could not remove link.')
    }
  }

  const busy = uploading || savingLink

  return (
    <div className="modal-overlay trip-modal-overlay" onClick={onClose} role="presentation">
      <div
        className="modal-content stop-tickets-modal-content"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-labelledby="stop-tickets-modal-title"
        aria-modal="true"
      >
        <div className="modal-header">
          <h2 id="stop-tickets-modal-title">Tickets</h2>
          <button type="button" className="modal-close-button" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <div className="modal-form flights-modal-form stop-tickets-modal-form">
          {stopTitle ? <h4>{stopTitle}</h4> : null}
          <p className="setup-subtitle">
            Save ticket screenshots or links to confirmation emails and passes.
          </p>

          {error ? <p className="join-error">{error}</p> : null}

          {savesDisabled ? (
            <p className="setup-subtitle">Connect to the internet to add or remove attachments.</p>
          ) : null}

          <div className="stop-tickets-modal__section">
            <h4 className="stop-tickets-modal__section-title">Screenshots</h4>
            {!cloudinaryReady ? (
              <p className="setup-subtitle">
                Photo upload needs <code className="stop-tickets-modal__code">VITE_CLOUDINARY_CLOUD_NAME</code> and{' '}
                <code className="stop-tickets-modal__code">VITE_CLOUDINARY_UPLOAD_PRESET</code> in your env (unsigned
                preset, images only).
              </p>
            ) : null}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="stop-tickets-modal__file-input"
              aria-hidden
              tabIndex={-1}
              onChange={handleFileChange}
            />
            <button
              type="button"
              onClick={handlePickPhoto}
              disabled={savesDisabled || !cloudinaryReady || busy}
            >
              {uploading ? 'Uploading…' : 'Add photo'}
            </button>
            {photos.length > 0 ? (
              <ul className="stop-tickets-modal__photo-list" aria-label="Ticket screenshots">
                {photos.map((p) => (
                  <li key={p.id} className="stop-tickets-modal__photo-item">
                    <a
                      href={p.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="stop-tickets-modal__photo-thumb-wrap"
                    >
                      <img src={p.url} alt="" className="stop-tickets-modal__photo-thumb" />
                    </a>
                    <button
                      type="button"
                      className="flight-preview-delete"
                      onClick={() => handleRemovePhoto(p.id)}
                      disabled={savesDisabled || busy}
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="setup-subtitle">No screenshots yet.</p>
            )}
          </div>

          <div className="stop-tickets-modal__section">
            <h4 className="stop-tickets-modal__section-title">Links</h4>
            <label className="stop-tickets-modal__inline-label" htmlFor="stop-ticket-link-title">
              Link title <span className="stop-tickets-modal__optional">(optional)</span>
            </label>
            <input
              id="stop-ticket-link-title"
              type="text"
              placeholder="e.g. Delta confirmation, Train e-ticket"
              value={linkTitleDraft}
              onChange={(e) => setLinkTitleDraft(e.target.value)}
              disabled={savesDisabled || busy}
              autoComplete="off"
            />
            <label className="stop-tickets-modal__inline-label" htmlFor="stop-ticket-link-url">
              URL
            </label>
            <div className="stop-tickets-modal__link-row">
              <input
                id="stop-ticket-link-url"
                type="url"
                inputMode="url"
                placeholder="https://… or airline.com/confirm"
                value={linkDraft}
                onChange={(e) => setLinkDraft(e.target.value)}
                disabled={savesDisabled || busy}
                aria-label="Ticket or confirmation URL"
              />
              <button type="button" onClick={handleAddLink} disabled={savesDisabled || busy}>
                Add link
              </button>
            </div>
            {links.length > 0 ? (
              <ul className="stop-tickets-modal__link-list">
                {links.map((l) => {
                  const linkText = getTicketLinkLabel(l)
                  const aria =
                    linkText !== l.url ? `${linkText} (opens ${l.url})` : `Open link ${l.url}`
                  return (
                  <li key={l.id} className="stop-tickets-modal__link-row-item">
                    <a
                      href={l.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="stop-tickets-modal__link-anchor"
                      aria-label={aria}
                    >
                      {linkText}
                    </a>
                    <button
                      type="button"
                      className="flight-preview-delete"
                      onClick={() => handleRemoveLink(l.id)}
                      disabled={savesDisabled || busy}
                    >
                      Remove
                    </button>
                  </li>
                  )
                })}
              </ul>
            ) : (
              <p className="setup-subtitle">No links yet.</p>
            )}
          </div>

          <div className="modal-actions">
            <button type="button" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
