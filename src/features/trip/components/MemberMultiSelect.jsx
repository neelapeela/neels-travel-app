import { useId, useMemo } from 'react'
import { normalizeMembersValue } from '../../../utils/members'

function uniqSorted(ids) {
  if (!Array.isArray(ids)) return []
  return Array.from(new Set(ids.filter(Boolean).map(String))).sort()
}

/** UI selection → stored `splitMembers` / `members` (null when everyone is explicitly selected). */
export function membersSelectionForSave(selected, allParticipantIds) {
  const allIds = uniqSorted(allParticipantIds)
  const picked = uniqSorted(Array.isArray(selected) ? selected : [])
  if (picked.length === 0) {
    return { ok: false, value: null }
  }
  const everyone =
    allIds.length > 0 &&
    picked.length === allIds.length &&
    allIds.every((id) => picked.includes(id))
  return { ok: true, value: everyone ? null : picked }
}

/** Keep UI selection as an id array (drops ids no longer on the trip). */
export function filterMembersSelection(selected, allParticipantIds) {
  const allSet = new Set(uniqSorted(allParticipantIds))
  return uniqSorted(Array.isArray(selected) ? selected : []).filter((id) => allSet.has(id))
}

export function membersSelectionFromStored(stored, allParticipantIds) {
  const allIds = uniqSorted(allParticipantIds)
  if (stored == null) return allIds
  return uniqSorted(normalizeMembersValue(stored) || [])
}

/**
 * Trip participant picker (compact pills).
 *
 * Multi: `value` is a string[] — empty = none selected; full list = everyone.
 * Single: one participant id string, or '' when unset.
 */
export default function MemberMultiSelect({
  participants = [],
  participantNames = {},
  value = null,
  onChange,
  disabled = false,
  label = 'Members',
  mode = 'multi'
}) {
  const labelId = useId()
  const allIds = useMemo(() => uniqSorted(participants), [participants])
  const labelFor = (id) => (String(participantNames?.[id] || '').trim() ? participantNames[id] : 'Member')
  const selected = useMemo(() => {
    if (mode === 'single') return []
    if (Array.isArray(value)) return uniqSorted(value)
    if (value == null) return []
    return uniqSorted(normalizeMembersValue(value) || [])
  }, [mode, value])
  const allSelected =
    mode === 'multi' &&
    allIds.length > 0 &&
    selected.length === allIds.length &&
    allIds.every((id) => selected.includes(id))

  if (!allIds.length) return null

  const pillClass = (active) =>
    `member-multiselect__pill${active ? ' is-in' : ' is-out'}`

  const rootClass = `member-multiselect${disabled ? ' is-disabled' : ''}`

  const toggle = (id) => {
    if (disabled) return
    const next = new Set(selected)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    onChange?.(uniqSorted(Array.from(next)))
  }

  if (mode === 'single') {
    const selectedId = String(value || '').trim()
    return (
      <div className={rootClass} role="group" aria-labelledby={labelId}>
        <div className="member-multiselect__label" id={labelId}>
          {label}
        </div>
        <div className="member-multiselect__pills" role="list">
          {allIds.map((id) => (
            <button
              key={id}
              type="button"
              role="listitem"
              className={pillClass(selectedId === id)}
              aria-pressed={selectedId === id}
              onClick={() => onChange?.(id)}
              disabled={disabled}
            >
              {labelFor(id)}
            </button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className={rootClass} role="group" aria-labelledby={labelId}>
      <div className="member-multiselect__label" id={labelId}>
        {label}
      </div>
      <div className="member-multiselect__pills" role="list">
        <button
          type="button"
          className={pillClass(allSelected)}
          aria-pressed={allSelected}
          onClick={() => onChange?.(allIds.length ? [...allIds] : [])}
          disabled={disabled}
        >
          Everyone
        </button>
        {allIds.map((id) => (
          <button
            key={id}
            type="button"
            role="listitem"
            className={pillClass(selected.includes(id))}
            aria-pressed={selected.includes(id)}
            onClick={() => toggle(id)}
            disabled={disabled}
          >
            {labelFor(id)}
          </button>
        ))}
      </div>
    </div>
  )
}
