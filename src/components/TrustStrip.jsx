const CLAIMS = [
  'Single-origin release',
  'Roasted to order',
  'Ships free',
  'Cancel anytime',
]

export function TrustStrip() {
  return (
    <div className="strip">
      <div className="wrap">
        {CLAIMS.map((claim) => (
          <span key={claim}>
            <Check />
            {claim}
          </span>
        ))}
      </div>
    </div>
  )
}

function Check() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M20 6L9 17l-5-5"
        stroke="#E6BB63"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
