import { useId } from 'react'

/**
 * The Crema Seal — the house emblem. Rendered inline rather than as an <img>
 * so it stays crisp at any size and can be marked decorative.
 *
 * The gradient id comes from useId(): two seals on one page sharing an id
 * would make the second one reference the first one's def.
 */
export function CremaSeal({ size = 42, title = 'Kick Ass Coffee Co.', decorative = false }) {
  const gradientId = `crema-seal-${useId()}`

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      role={decorative ? 'presentation' : 'img'}
      aria-hidden={decorative || undefined}
      aria-label={decorative ? undefined : title}
      focusable="false"
    >
      <defs>
        <radialGradient id={gradientId} cx="42%" cy="36%" r="72%">
          <stop offset="0%" stopColor="#F0CE87" />
          <stop offset="46%" stopColor="#C6892C" />
          <stop offset="100%" stopColor="#8E5C18" />
        </radialGradient>
      </defs>
      <circle cx="50" cy="50" r="47.5" fill="#241309" stroke="#C6892C" strokeWidth="2" />
      <circle cx="50" cy="50" r="33" fill="#5A1A20" />
      <circle cx="50" cy="50" r="31" fill={`url(#${gradientId})`} />
      <g transform="rotate(-12 50 50)">
        <ellipse cx="50" cy="50" rx="12.6" ry="19" fill="#241309" />
        <path
          d="M50 33 C 45.5 40.5, 54.5 59.5, 50 67"
          fill="none"
          stroke="#E6BB63"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </g>
    </svg>
  )
}

/** Seal + wordmark lockup, used in the nav and footer. */
export function Wordmark({ size = 42, dark = false }) {
  return (
    <span className={`brand${dark ? ' brand--dark' : ''}`}>
      <CremaSeal size={size} decorative />
      <span className="wm">
        <span className="k">Kick Ass</span>
        <span className="c">Coffee Co.</span>
      </span>
    </span>
  )
}
