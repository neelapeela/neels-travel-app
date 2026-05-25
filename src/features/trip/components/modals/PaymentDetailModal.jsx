import { useEffect, useMemo, useState } from 'react'
import { shortLabelFromRawName } from '../../../../utils/participantLabels'
import { formatPaymentSplitMembersLabel } from '../../../../utils/paymentSplitMembers'
import MemberMultiSelect, {
  membersSelectionForSave,
  membersSelectionFromStored
} from '../MemberMultiSelect'

export default function PaymentDetailModal({
  payment,
  participants = [],
  participantNames = {},
  savesDisabled = false,
  onClose,
  onDelete,
  onSave
}) {
  const [editing, setEditing] = useState(false)
  const [amountDraft, setAmountDraft] = useState('')
  const [reasonDraft, setReasonDraft] = useState('')
  const [splitMembersDraft, setSplitMembersDraft] = useState([])
  const [payerIdDraft, setPayerIdDraft] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const participantIds = useMemo(
    () => (Array.isArray(participants) ? participants.filter(Boolean) : []),
    [participants]
  )

  useEffect(() => {
    if (!payment) {
      setEditing(false)
      return
    }
    setAmountDraft(String(payment.amount ?? ''))
    setReasonDraft(payment.reason || '')
    setSplitMembersDraft(membersSelectionFromStored(payment.splitMembers, participantIds))
    setPayerIdDraft(payment.payerId || '')
    setError('')
  }, [
    payment?.id,
    payment?.amount,
    payment?.reason,
    payment?.splitMembers,
    payment?.payerId,
    participantIds
  ])

  if (!payment) return null

  const nameForId = (id) => (participantNames?.[id] || '').trim() || 'Member'
  const payerLabel =
    payment.payerDisplayName ||
    participantNames?.[payment.payerId] ||
    shortLabelFromRawName(payment.payerName) ||
    payment.payerName ||
    'Member'
  const splitLabel =
    payment.splitMembersDisplay ||
    formatPaymentSplitMembersLabel(payment.splitMembers, participants, nameForId)

  const handleDeleteClick = () => {
    if (!window.confirm('Delete this payment? This cannot be undone.')) return
    onDelete?.(payment)
  }

  const startEditing = () => {
    setAmountDraft(String(payment.amount ?? ''))
    setReasonDraft(payment.reason || '')
    setSplitMembersDraft(membersSelectionFromStored(payment.splitMembers, participantIds))
    setPayerIdDraft(payment.payerId || participantIds[0] || '')
    setError('')
    setEditing(true)
  }

  const cancelEditing = () => {
    setAmountDraft(String(payment.amount ?? ''))
    setReasonDraft(payment.reason || '')
    setSplitMembersDraft(membersSelectionFromStored(payment.splitMembers, participantIds))
    setPayerIdDraft(payment.payerId || '')
    setError('')
    setEditing(false)
  }

  const handleSaveClick = async () => {
    if (savesDisabled || saving) return
    const amount = Number(amountDraft)
    if (!Number.isFinite(amount) || amount <= 0) {
      setError('Enter a payment amount greater than zero.')
      return
    }
    const payerId = String(payerIdDraft || '').trim()
    if (!payerId) {
      setError('Select who paid.')
      return
    }
    const splitResult = membersSelectionForSave(splitMembersDraft, participantIds)
    if (!splitResult.ok) {
      setError('Select at least one person to split this payment.')
      return
    }
    setError('')
    setSaving(true)
    try {
      const payerName = participantNames?.[payerId] || payment.payerName || 'Member'
      await onSave?.(payment, {
        payerId,
        payerName,
        reason: reasonDraft.trim(),
        amount,
        splitMembers: splitResult.value
      })
      setEditing(false)
    } catch (err) {
      console.error(err)
      setError(err?.message || 'Could not save payment.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content stop-payment-modal" onClick={(event) => event.stopPropagation()}>
        <div className="modal-header stop-payment-modal-header">
          <h2>{editing ? 'Edit payment' : 'Payment'}</h2>
          <div className="modal-header-inline-actions">
            {!editing ? (
              <button
                type="button"
                className="stop-payment-modal-edit"
                onClick={startEditing}
                disabled={savesDisabled}
                aria-label="Edit payment"
              >
                Edit
              </button>
            ) : null}
            <button
              type="button"
              className="stop-payment-modal-delete"
              onClick={handleDeleteClick}
              disabled={savesDisabled || saving}
              aria-label="Delete payment"
            >
              Delete
            </button>
            <button type="button" className="modal-close-button" onClick={onClose} aria-label="Close">
              ×
            </button>
          </div>
        </div>
        <div className="modal-form stop-payment-detail">
          {editing ? (
            <>
              {participantIds.length > 0 ? (
                <MemberMultiSelect
                  mode="single"
                  label="Paid by"
                  participants={participantIds}
                  participantNames={participantNames}
                  value={payerIdDraft}
                  onChange={setPayerIdDraft}
                  disabled={savesDisabled || saving}
                />
              ) : null}
              <div className="form-group">
                <label htmlFor="edit-payment-amount">Amount</label>
                <input
                  id="edit-payment-amount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  inputMode="decimal"
                  value={amountDraft}
                  onChange={(event) => setAmountDraft(event.target.value)}
                  disabled={savesDisabled || saving}
                />
              </div>
              <div className="form-group">
                <label htmlFor="edit-payment-reason">Reason</label>
                <input
                  id="edit-payment-reason"
                  type="text"
                  value={reasonDraft}
                  onChange={(event) => setReasonDraft(event.target.value)}
                  placeholder="e.g. Lunch, tickets"
                  disabled={savesDisabled || saving}
                />
              </div>
              {participantIds.length > 0 ? (
                <MemberMultiSelect
                  participants={participantIds}
                  participantNames={participantNames}
                  value={splitMembersDraft}
                  onChange={setSplitMembersDraft}
                  disabled={savesDisabled || saving}
                  label="Split between"
                />
              ) : null}
              {error ? <p className="stop-payment-modal-error">{error}</p> : null}
              <div className="modal-actions">
                <button type="button" onClick={cancelEditing} disabled={saving}>
                  Cancel
                </button>
                <button type="button" onClick={handleSaveClick} disabled={savesDisabled || saving}>
                  {saving ? 'Saving…' : 'Save'}
                </button>
              </div>
            </>
          ) : (
            <>
              <dl className="stop-payment-detail-dl">
                <dt>Paid by</dt>
                <dd>{payerLabel}</dd>
                <dt>Amount</dt>
                <dd>${Number(payment.amount || 0).toFixed(2)}</dd>
                <dt>Reason</dt>
                <dd>{payment.reason?.trim() ? payment.reason : '—'}</dd>
                <dt>Split between</dt>
                <dd>{splitLabel}</dd>
                {payment.createdAt ? (
                  <>
                    <dt>Recorded</dt>
                    <dd>{new Date(payment.createdAt).toLocaleString()}</dd>
                  </>
                ) : null}
              </dl>
              <div className="modal-actions">
                <button type="button" onClick={onClose}>
                  Close
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
