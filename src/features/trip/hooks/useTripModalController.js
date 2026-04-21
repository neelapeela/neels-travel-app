import { useCallback, useReducer } from 'react'

const initialState = {
  showAddStopModal: false,
  showShareMenu: false,
  showSettingsModal: false,
  showPaymentsModal: false,
  showFlightsModal: false,
  showLodgingModal: false,
  showStopTicketsModal: false
}

function reducer(state, action) {
  switch (action.type) {
    case 'set':
      return {
        ...state,
        [action.key]: action.value
      }
    case 'closeAllForOffline':
      return {
        ...state,
        showAddStopModal: false,
        showSettingsModal: false,
        showFlightsModal: false,
        showLodgingModal: false,
        showPaymentsModal: false,
        showStopTicketsModal: false
      }
    default:
      return state
  }
}

function nextValue(current, next) {
  return typeof next === 'function' ? next(current) : next
}

export function useTripModalController() {
  const [state, dispatch] = useReducer(reducer, initialState)

  const makeSetter = useCallback(
    (key) => (next) => {
      dispatch({
        type: 'set',
        key,
        value: nextValue(state[key], next)
      })
    },
    [state]
  )

  const setShowAddStopModal = makeSetter('showAddStopModal')
  const setShowShareMenu = makeSetter('showShareMenu')
  const setShowSettingsModal = makeSetter('showSettingsModal')
  const setShowPaymentsModal = makeSetter('showPaymentsModal')
  const setShowFlightsModal = makeSetter('showFlightsModal')
  const setShowLodgingModal = makeSetter('showLodgingModal')
  const setShowStopTicketsModal = makeSetter('showStopTicketsModal')
  const closeAllForOffline = useCallback(() => dispatch({ type: 'closeAllForOffline' }), [])

  return {
    ...state,
    setShowAddStopModal,
    setShowShareMenu,
    setShowSettingsModal,
    setShowPaymentsModal,
    setShowFlightsModal,
    setShowLodgingModal,
    setShowStopTicketsModal,
    closeAllForOffline
  }
}

