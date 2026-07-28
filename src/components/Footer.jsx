import { Wordmark } from './CremaSeal.jsx'

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="wrap">
        <div className="foot-brand">
          <Wordmark size={34} />
          <p className="foot-note">
            Roasted to order in small batches. Skip a month, change your grind, or cancel whenever
            the mood takes you — no phone calls, no guilt trip.
          </p>
        </div>
        <div className="foot-links">
          <a href="/#roast">Our Roast</a>
          <a href="/#ritual">The Ritual</a>
          <a href="/#plan">Subscription</a>
          <a href="/#faq">Support</a>
        </div>
      </div>
      <div className="wrap foot-legal">
        <span>© {new Date().getFullYear()} Kick Ass Coffee Co. · Est 2026</span>
        <span>Payments handled by Hyperswitch. We never see your card details.</span>
      </div>
    </footer>
  )
}
