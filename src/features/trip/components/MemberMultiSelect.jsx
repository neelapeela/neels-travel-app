import { useMemo } from 'react'

function uniqSorted(ids) {
  if (!Array.isArray(ids)) return []
  return Array.from(new Set(ids.filter(Boolean).map(String))).sort()
}

/**
 * Stop members selector.
 *
 * `value`:
 * - null => all trip members included
 * - string[] => explicit member ids
 */
export default function MemberMultiSelect({
  participants = [],
  participantNames = {},
  value = null,
  onChange,
  disabled = false,
  label = 'Members'
}) {
  const allIds = useMemo(() => uniqSorted(participants), [participants])
  const selected = useMemo(() => (value == null ? allIds : uniqSorted(value)), [value, allIds])
  const allSelected = allIds.length > 0 && selected.length === allIds.length

  const labelFor = (id) => (String(participantNames?.[id] || '').trim() ? participantNames[id] : 'Member')

  const setAll = () => onChange?.(null)

  const setExplicit = (ids) => {
    const next = uniqSorted(ids)
    if (next.length === 0 || next.length === allIds.length) {
      onChange?.(null)
      return
    }
    onChange?.(next)
  }

  const toggle = (id) => {
    if (disabled) return
    const next = new Set(selected)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setExplicit(Array.from(next))
  }

  if (!allIds.length) return null

  return (
    <fieldset className="member-multiselect" disabled={disabled}>
      <legend className="member-multiselect__label">{label}</legend>
      <div className="member-multiselect__pills" role="list">
        <button
          type="button"
          className={`member-multiselect__pill${allSelected ? ' is-active' : ''}`}
          onClick={setAll}
          disabled={disabled}
        >
          Select all
        </button>
        {allIds.map((id) => (
          <button
            key={id}
            type="button"
            className={`member-multiselect__pill${selected.includes(id) ? ' is-active' : ''}`}
            onClick={() => toggle(id)}
            disabled={disabled}
            role="listitem"
          >
            {labelFor(id)}
          </button>
        ))}
      </div>
    </fieldset>
  )
}

