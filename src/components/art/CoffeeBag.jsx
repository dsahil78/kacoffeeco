/**
 * Product shot of the 12 oz bag, used in the checkout order summary and the
 * tasting band. Standing in for photography — swap via ProductFrame's `src`.
 *
 * preserveAspectRatio is `slice` so the artwork fills its frame edge to edge
 * the way a photograph would; `meet` would letterbox and leave the frame
 * showing through around it.
 */
export function CoffeeBag() {
  return (
    <svg
      className="bag-art"
      viewBox="0 0 260 300"
      role="img"
      aria-label="A 12 oz bag of Kick Ass Coffee Co. single-origin beans"
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <radialGradient id="bg-room" cx="42%" cy="26%" r="86%">
          <stop offset="0%" stopColor="#5E3C22" />
          <stop offset="60%" stopColor="#33200F" />
          <stop offset="100%" stopColor="#1C1008" />
        </radialGradient>
        <linearGradient id="bg-body" x1="0" y1="0" x2="1" y2="0.35">
          <stop offset="0%" stopColor="#52341F" />
          <stop offset="46%" stopColor="#36220F" />
          <stop offset="100%" stopColor="#1F1309" />
        </linearGradient>
        <linearGradient id="bg-label" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#F8ECD4" />
          <stop offset="100%" stopColor="#E0C89E" />
        </linearGradient>
        <radialGradient id="bg-seal" cx="42%" cy="36%" r="72%">
          <stop offset="0%" stopColor="#F0CE87" />
          <stop offset="46%" stopColor="#C6892C" />
          <stop offset="100%" stopColor="#8E5C18" />
        </radialGradient>
        <filter id="bg-cast" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="9" />
        </filter>
      </defs>

      <rect width="260" height="300" fill="url(#bg-room)" />
      <ellipse cx="130" cy="150" rx="118" ry="118" fill="#E6BB63" opacity="0.1" />

      {/* cast shadow */}
      <ellipse cx="130" cy="272" rx="88" ry="16" fill="#0C0603" opacity="0.66" filter="url(#bg-cast)" />

      <g transform="translate(60 44)">
        {/* body */}
        <path d="M6 30 Q70 12 134 30 L142 218 Q70 236 -2 218 Z" fill="url(#bg-body)" />
        {/* centre fold */}
        <path d="M70 20 L70 226" stroke="#7A5228" strokeWidth="1" opacity="0.22" />
        {/* rolled top with a crimp */}
        <path d="M2 32 Q70 10 138 32 L138 10 Q70 -10 2 10 Z" fill="#1F1207" />
        <path d="M2 12 Q70 -8 138 12" stroke="#8A5F32" strokeWidth="1.4" fill="none" opacity="0.55" />
        {/* left edge highlight */}
        <path d="M10 34 Q18 128 12 214" stroke="#C08B4E" strokeWidth="2.6" fill="none" opacity="0.26" />

        {/* label */}
        <rect x="20" y="70" width="100" height="118" rx="9" fill="url(#bg-label)" />
        <circle cx="70" cy="106" r="19" fill="#241309" stroke="#C6892C" strokeWidth="1.2" />
        <circle cx="70" cy="106" r="12.6" fill="url(#bg-seal)" />
        <ellipse cx="70" cy="106" rx="4.8" ry="7.4" fill="#241309" transform="rotate(-12 70 106)" />

        <rect x="36" y="136" width="68" height="5" rx="2.5" fill="#241309" opacity="0.82" />
        <rect x="46" y="149" width="48" height="3.4" rx="1.7" fill="#A66E1E" opacity="0.75" />
        <rect x="40" y="160" width="60" height="3" rx="1.5" fill="#8A6F52" opacity="0.6" />
        <rect x="52" y="170" width="36" height="3" rx="1.5" fill="#8A6F52" opacity="0.45" />

        {/* degassing valve */}
        <circle cx="105" cy="204" r="6" fill="#120A05" opacity="0.9" />
      </g>
    </svg>
  )
}
