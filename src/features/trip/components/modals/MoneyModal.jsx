import { SETTLEMENT_EPS } from '../../../../utils/paymentSettlement'
import { formatSignedMoney } from '../../../../utils/formatMoney'

/**
 * Trip-wide money: Overview (settle-up vs you) + Logs (all payments).
 */
export default function MoneyModal({
  onClose,
  paymentsMoneyTab,
  onTabChange,
  paymentTotals,
  paymentOverviewVsYou,
  allPayments,
  onSelectLogPayment,
  userId,
  participantCount
}) {
  return (
    <div className="modal-overlay trip-modal-overlay" onClick={onClose}>
      <div className="modal-content money-modal-content" onClick={(event) => event.stopPropagation()}>
        <div className="modal-header money-modal-header">
          <h2>Money</h2>
          <button type="button" className="modal-close-button" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <div className="money-modal-tabs" role="tablist" aria-label="Money views">
          <button
            type="button"
            role="tab"
            id="money-tab-overview"
            aria-selected={paymentsMoneyTab === 'overview'}
            className={`money-modal-tab${paymentsMoneyTab === 'overview' ? ' money-modal-tab--active' : ''}`}
            onClick={() => onTabChange('overview')}
          >
            Overview
          </button>
          <button
            type="button"
            role="tab"
            id="money-tab-logs"
            aria-selected={paymentsMoneyTab === 'logs'}
            className={`money-modal-tab${paymentsMoneyTab === 'logs' ? ' money-modal-tab--active' : ''}`}
            onClick={() => onTabChange('logs')}
          >
            Logs
          </button>
        </div>
        <div className="modal-form money-modal-body">
          {paymentsMoneyTab === 'overview' && (
            <div role="tabpanel" aria-labelledby="money-tab-overview" className="money-modal-panel">
              <p className="money-modal-summary">
                Total trip spend: <strong>${paymentTotals.total.toFixed(2)}</strong>
                {participantCount > 0 && userId && (
                  <>
                    {' · '}
                    Your assigned share: <strong>${Number(paymentTotals.assignedShare ?? paymentTotals.share ?? 0).toFixed(2)}</strong>
                  </>
                )}
              </p>
              {userId && paymentOverviewVsYou.kind === 'ok' ? (
                <p className="money-modal-summary money-modal-summary--you">
                  Your net balance:{' '}
                  <strong
                    className={
                      paymentOverviewVsYou.yourNetVsShare > SETTLEMENT_EPS
                        ? 'money-balance--positive'
                        : paymentOverviewVsYou.yourNetVsShare < -SETTLEMENT_EPS
                          ? 'money-balance--negative'
                          : 'money-balance--zero'
                    }
                  >
                    {formatSignedMoney(paymentOverviewVsYou.yourNetVsShare)}
                  </strong>
                </p>
              ) : null}
              <p className="money-modal-hint">
                Amounts below are <strong>for you only</strong>, based on each stop&apos;s selected members:
                who owes you (or you owe) in the minimal settlement plan.
              </p>
              {paymentOverviewVsYou.kind === 'empty' ? (
                <p className="money-modal-empty">No participants on this trip yet.</p>
              ) : paymentOverviewVsYou.kind === 'no_user' ? (
                <p className="money-modal-empty">Sign in to see how you settle with each traveler.</p>
              ) : paymentOverviewVsYou.kind === 'not_in_trip' ? (
                <p className="money-modal-empty">
                  You’re not on this trip’s participant list, so pairwise balances aren’t shown.
                </p>
              ) : paymentOverviewVsYou.rows.length === 0 ? (
                <p className="money-modal-empty">
                  You’re the only traveler so far—invite others to see who owes whom.
                </p>
              ) : (
                <div className="money-modal-table-wrap">
                  <table className="payments-table money-overview-table">
                    <thead>
                      <tr>
                        <th>Traveler</th>
                        <th>With you</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paymentOverviewVsYou.rows.map((row) => {
                        const { net } = row
                        const isEven = Math.abs(net) < SETTLEMENT_EPS
                        return (
                          <tr key={row.otherId}>
                            <td>{row.label}</td>
                            <td>
                              {isEven ? (
                                <span className="money-balance--zero">Even</span>
                              ) : net > 0 ? (
                                <div className="money-overview-with-you">
                                  <span className="money-balance--positive">{formatSignedMoney(net)}</span>
                                  <span className="money-overview-sublabel">They owe you</span>
                                </div>
                              ) : (
                                <div className="money-overview-with-you">
                                  <span className="money-balance--negative">{formatSignedMoney(net)}</span>
                                  <span className="money-overview-sublabel">You owe them</span>
                                </div>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
          {paymentsMoneyTab === 'logs' && (
            <div role="tabpanel" aria-labelledby="money-tab-logs" className="money-modal-panel">
              {allPayments.length === 0 ? (
                <p className="money-modal-empty">No payments logged yet.</p>
              ) : (
                <div className="money-modal-table-wrap">
                  <table className="payments-table money-logs-table">
                    <thead>
                      <tr>
                        <th>Day</th>
                        <th>User</th>
                        <th>Reason</th>
                        <th>Amount</th>
                        <th>Stop</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allPayments.map((payment) => (
                        <tr
                          key={payment.id}
                          className="money-logs-row"
                          role="button"
                          tabIndex={0}
                          onClick={() => onSelectLogPayment?.(payment)}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                              event.preventDefault()
                              onSelectLogPayment?.(payment)
                            }
                          }}
                          aria-label={`Open payment for ${payment.stopTitle || 'stop'}`}
                        >
                          <td>{payment.dayDate || '—'}</td>
                          <td>{payment.payerDisplayName}</td>
                          <td>{payment.reason || '—'}</td>
                          <td>${Number(payment.amount).toFixed(2)}</td>
                          <td>{payment.stopTitle}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
