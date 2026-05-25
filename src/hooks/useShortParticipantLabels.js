import { useEffect, useMemo, useState } from 'react'
import { getParticipantDisplayNamesByIds } from '../api/user'
import { normalizeMembersValue } from '../utils/members'
import { buildShortParticipantLabels } from '../utils/participantLabels'

/**
 * Trip participant ids → disambiguated short display labels (first name, + last initial if needed).
 */
export function useShortParticipantLabels(trip, extraRawById = {}) {
  const participantIds = useMemo(
    () => normalizeMembersValue(trip?.participants) || [],
    [trip?.participants]
  )
  const participantIdsKey = useMemo(() => [...participantIds].sort().join(','), [participantIds])
  const namesOnTrip = useMemo(
    () =>
      trip?.participantNames && typeof trip.participantNames === 'object' ? trip.participantNames : {},
    [trip?.participantNames]
  )

  const [profileNamesById, setProfileNamesById] = useState({})

  useEffect(() => {
    if (participantIds.length === 0) {
      setProfileNamesById({})
      return undefined
    }
    let cancelled = false
    getParticipantDisplayNamesByIds(participantIds).then((map) => {
      if (!cancelled) setProfileNamesById(map)
    })
    return () => {
      cancelled = true
    }
  }, [participantIds, participantIdsKey])

  const rawNamesById = useMemo(() => {
    const merged = {}
    for (const id of participantIds) {
      const fromTrip = (namesOnTrip[id] || '').trim()
      const fromProfile = (profileNamesById[id] || '').trim()
      const fromExtra = (extraRawById[id] || '').trim()
      merged[id] = fromTrip || fromProfile || fromExtra || ''
    }
    return merged
  }, [participantIds, namesOnTrip, profileNamesById, extraRawById])

  return useMemo(
    () => buildShortParticipantLabels(participantIds, rawNamesById),
    [participantIds, rawNamesById]
  )
}
