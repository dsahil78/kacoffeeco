/**
 * Hero artwork: a cup of espresso under a warm spotlight, bag behind, beans
 * scattered on the counter.
 *
 * Built as one scene in a single viewBox rather than absolutely-positioned
 * fragments, so the whole composition scales as a unit — which is what makes it
 * survive a 360px phone without the pieces drifting apart.
 *
 * Standing in for product photography. Swap via ProductFrame's `src` prop.
 */
export function HeroScene() {
  return (
    <svg
      className="hero-scene"
      viewBox="0 0 560 700"
      role="img"
      aria-label="A cup of espresso with golden crema beside a bag of freshly roasted beans"
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        {/* ambience */}
        <radialGradient id="hs-room" cx="46%" cy="34%" r="78%">
          <stop offset="0%" stopColor="#6B4526" />
          <stop offset="42%" stopColor="#3E2718" />
          <stop offset="100%" stopColor="#1E1009" />
        </radialGradient>
        <radialGradient id="hs-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#E6BB63" stopOpacity="0.55" />
          <stop offset="55%" stopColor="#C6892C" stopOpacity="0.16" />
          <stop offset="100%" stopColor="#C6892C" stopOpacity="0" />
        </radialGradient>

        {/* ceramic */}
        <linearGradient id="hs-cup" x1="0" y1="0" x2="1" y2="0.6">
          <stop offset="0%" stopColor="#FFFaF1" />
          <stop offset="38%" stopColor="#F2E3C9" />
          <stop offset="72%" stopColor="#D9C29C" />
          <stop offset="100%" stopColor="#B99C74" />
        </linearGradient>
        <linearGradient id="hs-cupIn" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#C9B08B" />
          <stop offset="100%" stopColor="#F6ECDA" />
        </linearGradient>
        <radialGradient id="hs-saucer" cx="50%" cy="38%" r="62%">
          <stop offset="0%" stopColor="#F7EDDA" />
          <stop offset="70%" stopColor="#DCC7A2" />
          <stop offset="100%" stopColor="#B99C74" />
        </radialGradient>

        {/* the crema — the emotional centre of the whole page */}
        <radialGradient id="hs-crema" cx="38%" cy="32%" r="78%">
          <stop offset="0%" stopColor="#F0D69B" />
          <stop offset="27%" stopColor="#D9A44E" />
          <stop offset="62%" stopColor="#B87A24" />
          <stop offset="100%" stopColor="#6E4413" />
        </radialGradient>

        <radialGradient id="hs-vig" cx="50%" cy="46%" r="72%">
          <stop offset="60%" stopColor="#000" stopOpacity="0" />
          <stop offset="100%" stopColor="#000" stopOpacity="0.42" />
        </radialGradient>

        {/* bag */}
        <linearGradient id="hs-bag" x1="0" y1="0" x2="1" y2="0.4">
          <stop offset="0%" stopColor="#4C2F1C" />
          <stop offset="45%" stopColor="#33200F" />
          <stop offset="100%" stopColor="#1F1309" />
        </linearGradient>
        <linearGradient id="hs-label" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#F6E9CE" />
          <stop offset="100%" stopColor="#DCC49A" />
        </linearGradient>

        <filter id="hs-soft" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="14" />
        </filter>
        <filter id="hs-cast" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="18" />
        </filter>
      </defs>

      {/* room */}
      <rect width="560" height="700" fill="url(#hs-room)" />
      <ellipse cx="280" cy="300" rx="250" ry="250" fill="url(#hs-glow)" />

      {/* counter plane */}
      <path d="M0 470 Q280 432 560 470 L560 700 L0 700 Z" fill="#170C06" opacity="0.55" />
      <path d="M0 470 Q280 432 560 470" stroke="#8A5F32" strokeWidth="1.2" opacity="0.35" fill="none" />

      {/* ---------- BAG, behind and left ---------- */}
      <g transform="translate(74 196)">
        <ellipse cx="86" cy="292" rx="104" ry="20" fill="#0E0704" opacity="0.6" filter="url(#hs-cast)" />
        {/* body with a gusset fold */}
        <path
          d="M14 42 Q86 22 158 42 L168 274 Q86 292 4 274 Z"
          fill="url(#hs-bag)"
        />
        <path d="M86 30 L86 282" stroke="#6B451F" strokeWidth="1" opacity="0.28" />
        {/* rolled top */}
        <path d="M10 44 Q86 20 162 44 L162 20 Q86 -2 10 20 Z" fill="#241309" />
        <path d="M10 22 Q86 0 162 22" stroke="#8A5F32" strokeWidth="1.4" fill="none" opacity="0.5" />
        {/* label */}
        <rect x="34" y="104" width="104" height="118" rx="10" fill="url(#hs-label)" opacity="0.96" />
        <circle cx="86" cy="146" r="21" fill="#241309" />
        <circle cx="86" cy="146" r="14" fill="#C6892C" />
        <ellipse cx="86" cy="146" rx="5.4" ry="8.4" fill="#241309" transform="rotate(-12 86 146)" />
        <rect x="52" y="180" width="68" height="4.6" rx="2.3" fill="#241309" opacity="0.78" />
        <rect x="62" y="192" width="48" height="3.6" rx="1.8" fill="#8A6F52" opacity="0.7" />
        <rect x="58" y="203" width="56" height="3.6" rx="1.8" fill="#A66E1E" opacity="0.6" />
        {/* highlight down the left edge */}
        <path d="M18 46 Q26 160 22 268" stroke="#C08B4E" strokeWidth="2.4" fill="none" opacity="0.3" />
      </g>

      {/* ---------- STEAM ---------- */}
      <g stroke="#F7EFE1" strokeWidth="6" fill="none" strokeLinecap="round" opacity="0.42">
        <path d="M300 356 C 278 316, 322 296, 300 254 C 286 226, 314 210, 300 178">
          <animate attributeName="opacity" values="0.12;0.5;0.12" dur="5s" repeatCount="indefinite" />
        </path>
        <path d="M366 366 C 390 328, 348 306, 372 266 C 386 240, 358 226, 372 196">
          <animate attributeName="opacity" values="0.44;0.1;0.44" dur="6.2s" repeatCount="indefinite" />
        </path>
        <path d="M336 344 C 316 310, 352 292, 336 258">
          <animate attributeName="opacity" values="0.28;0.05;0.28" dur="4.4s" repeatCount="indefinite" />
        </path>
      </g>

      {/* ---------- CUP, front and centre ---------- */}
      <g transform="translate(180 352)">
        <ellipse cx="156" cy="196" rx="168" ry="30" fill="#0E0704" opacity="0.62" filter="url(#hs-cast)" />

        {/* saucer */}
        <ellipse cx="156" cy="180" rx="162" ry="36" fill="url(#hs-saucer)" />
        <ellipse cx="156" cy="174" rx="150" ry="31" fill="#E4D0AC" opacity="0.55" />
        <ellipse cx="156" cy="172" rx="98" ry="20" fill="#C7AE86" />

        {/* handle */}
        <path
          d="M262 62 C 330 46, 336 148, 268 156"
          fill="none"
          stroke="url(#hs-cup)"
          strokeWidth="21"
          strokeLinecap="round"
        />
        <path
          d="M262 62 C 320 50, 326 142, 268 152"
          fill="none"
          stroke="#B99C74"
          strokeWidth="7"
          strokeLinecap="round"
          opacity="0.45"
        />

        {/* body */}
        <path
          d="M42 60 C 46 140, 96 172, 156 172 C 216 172, 266 140, 270 60 Z"
          fill="url(#hs-cup)"
        />
        {/* warm bounce light from the counter */}
        <path
          d="M56 96 C 70 146, 110 166, 156 168 C 202 166, 242 146, 256 96"
          fill="none"
          stroke="#C08B4E"
          strokeWidth="6"
          opacity="0.16"
        />
        <ellipse cx="156" cy="60" rx="114" ry="32" fill="url(#hs-cupIn)" />

        {/* coffee + crema */}
        <ellipse cx="156" cy="59" rx="101" ry="27" fill="#2E1A0A" />
        <ellipse cx="156" cy="57" rx="95" ry="24" fill="url(#hs-crema)" />
        {/* crema swirl */}
        <path
          d="M104 52 C 128 38, 186 38, 208 54"
          fill="none"
          stroke="#F0D89B"
          strokeWidth="3"
          strokeLinecap="round"
          opacity="0.4"
        />
        <path
          d="M118 64 C 142 74, 176 74, 198 64"
          fill="none"
          stroke="#8A5A1C"
          strokeWidth="2.4"
          strokeLinecap="round"
          opacity="0.34"
        />
        {/* micro-bubbles at the meniscus */}
        <circle cx="118" cy="50" r="3.1" fill="#F5E2B4" opacity="0.5" />
        <circle cx="132" cy="45" r="2.1" fill="#F5E2B4" opacity="0.42" />
        <circle cx="186" cy="47" r="2.6" fill="#F5E2B4" opacity="0.4" />
        <circle cx="204" cy="58" r="1.9" fill="#F5E2B4" opacity="0.34" />
        <ellipse cx="132" cy="48" rx="30" ry="8" fill="#F7E7BC" opacity="0.3" />

        {/* rim */}
        <path
          d="M44 56 A112 30 0 0 1 268 56"
          fill="none"
          stroke="#FFFBF2"
          strokeWidth="3"
          opacity="0.7"
        />
      </g>

      {/* ---------- BEANS on the counter ---------- */}
      <Bean x={96} y={556} r={-18} s={1.15} />
      <Bean x={146} y={588} r={38} s={0.95} />
      <Bean x={452} y={548} r={22} s={1.1} />
      <Bean x={496} y={592} r={-34} s={0.88} />
      <Bean x={410} y={604} r={62} s={0.78} />

      {/* vignette to seat everything in the frame */}
      <rect width="560" height="700" fill="url(#hs-vig)" />
    </svg>
  )
}

function Bean({ x, y, r, s }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${r}) scale(${s})`}>
      <ellipse cx="0" cy="13" rx="16" ry="6" fill="#0E0704" opacity="0.5" />
      <ellipse cx="0" cy="0" rx="13" ry="18" fill="#3A230F" />
      <ellipse cx="-4" cy="-6" rx="6" ry="8" fill="#5A3A1C" opacity="0.55" />
      <path
        d="M0 -16 C -6 -8, 6 8, 0 16"
        stroke="#1B0F06"
        strokeWidth="2.6"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M0 -16 C -6 -8, 6 8, 0 16"
        stroke="#C6892C"
        strokeWidth="0.9"
        fill="none"
        strokeLinecap="round"
        opacity="0.45"
      />
    </g>
  )
}
