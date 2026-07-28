import { Link } from 'react-router-dom'
import { Wordmark } from './CremaSeal.jsx'

/**
 * Site nav. `compact` drops the section links and the cart glyph — used on the
 * checkout flow, where the only useful action is getting back out.
 */
export function Nav({ compact = false }) {
  return (
    <nav className="site-nav" aria-label="Primary">
      <Link to="/" className="brand-link" aria-label="Kick Ass Coffee Co., home">
        <Wordmark />
      </Link>

      {!compact && (
        <div className="nav-links">
          <a href="/#roast">Our Roast</a>
          <a href="/#ritual">The Ritual</a>
          <a href="/#plan">Subscription</a>
          <a href="/#journal">Journal</a>
        </div>
      )}

      <div className="nav-cta">
        {compact ? (
          <span className="nav-secure">
            <LockIcon />
            Secure checkout
          </span>
        ) : (
          <>
            <svg
              className="cart"
              width="21"
              height="21"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M6 6h15l-1.5 9h-12L6 6zM6 6L5 3H2m5 18a1 1 0 100-2 1 1 0 000 2zm11 0a1 1 0 100-2 1 1 0 000 2z"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <Link to="/checkout" className="btn btn-primary">
              Start the Kick
            </Link>
          </>
        )}
      </div>
    </nav>
  )
}

function LockIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect
        x="4"
        y="10"
        width="16"
        height="11"
        rx="2.5"
        stroke="currentColor"
        strokeWidth="1.9"
      />
      <path d="M8 10V7a4 4 0 018 0v3" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
    </svg>
  )
}
