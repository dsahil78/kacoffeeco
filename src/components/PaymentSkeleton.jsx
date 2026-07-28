/**
 * Placeholder shown while Unified Checkout boots.
 *
 * It deliberately mirrors the real widget's anatomy — a row of method tabs, a
 * card-number field, a two-up expiry/CVC row — so the handoff reads as the same
 * form resolving into focus rather than one thing being swapped for another.
 *
 * Purely decorative: the live status message next to it is what gets announced.
 */
export function PaymentSkeleton() {
  return (
    <div className="pay-skeleton" aria-hidden="true">
      <div className="sk-tabs">
        <span className="sk sk-tab" />
        <span className="sk sk-tab" />
        <span className="sk sk-tab" />
      </div>

      <div className="sk-field">
        <span className="sk sk-label" />
        <span className="sk sk-input" />
      </div>

      <div className="sk-row">
        <div className="sk-field">
          <span className="sk sk-label" />
          <span className="sk sk-input" />
        </div>
        <div className="sk-field">
          <span className="sk sk-label" />
          <span className="sk sk-input" />
        </div>
      </div>

      <div className="sk-field">
        <span className="sk sk-label" />
        <span className="sk sk-input" />
      </div>
    </div>
  )
}
