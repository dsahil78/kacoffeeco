/**
 * The hero visual: a lit disc, a ceramic espresso cup, a rotating roast seal,
 * a floating spec chip and three beans.
 *
 * The cup is an illustration standing in for product photography. When real
 * photos land, swap the <svg className="cup-svg"> for an <img className="cup-svg">
 * — the disc, glow, seal, chip and beans are positioned against `.visual` and
 * need no changes.
 */
export function HeroVisual() {
  return (
    <div className="visual">
      <div className="disc" />
      <div className="glow" />

      <svg
        className="cup-svg"
        viewBox="0 0 400 400"
        role="img"
        aria-label="A cup of espresso with golden crema"
      >
        <defs>
          <linearGradient id="ceramic" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#FBF4E7" />
            <stop offset="55%" stopColor="#EAD9BE" />
            <stop offset="100%" stopColor="#CBB491" />
          </linearGradient>
          <linearGradient id="ceramicIn" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#D9C4A2" />
            <stop offset="100%" stopColor="#F6ECDA" />
          </linearGradient>
          <radialGradient id="crema2" cx="42%" cy="38%" r="70%">
            <stop offset="0%" stopColor="#E9C57E" />
            <stop offset="42%" stopColor="#C6892C" />
            <stop offset="100%" stopColor="#7B4E17" />
          </radialGradient>
          <radialGradient id="saucer" cx="50%" cy="42%" r="60%">
            <stop offset="0%" stopColor="#F5EAD6" />
            <stop offset="100%" stopColor="#C9B18C" />
          </radialGradient>
        </defs>

        {/* steam */}
        <g stroke="#F7EFE1" strokeWidth="5" fill="none" strokeLinecap="round" opacity=".5">
          <path d="M176 128 C 160 104, 192 92, 176 66 C 166 50, 184 40, 176 24">
            <animate
              attributeName="opacity"
              values=".15;.55;.15"
              dur="4s"
              repeatCount="indefinite"
            />
          </path>
          <path d="M224 132 C 240 108, 208 96, 224 70 C 234 54, 216 44, 224 28">
            <animate
              attributeName="opacity"
              values=".5;.15;.5"
              dur="4.6s"
              repeatCount="indefinite"
            />
          </path>
        </g>

        {/* saucer */}
        <ellipse cx="200" cy="322" rx="150" ry="34" fill="#B79A72" opacity=".5" />
        <ellipse cx="200" cy="314" rx="146" ry="32" fill="url(#saucer)" />
        <ellipse cx="200" cy="310" rx="96" ry="20" fill="#C7AE86" />

        {/* handle */}
        <path
          d="M300 214 C 356 202, 360 276, 306 282"
          fill="none"
          stroke="url(#ceramic)"
          strokeWidth="19"
          strokeLinecap="round"
        />
        <path
          d="M300 214 C 348 205, 352 270, 306 278"
          fill="none"
          stroke="#C2A87F"
          strokeWidth="7"
          strokeLinecap="round"
          opacity=".5"
        />

        {/* cup body */}
        <path
          d="M96 214 C 100 286, 148 306, 200 306 C 252 306, 300 286, 304 214 Z"
          fill="url(#ceramic)"
        />
        <ellipse cx="200" cy="214" rx="104" ry="30" fill="url(#ceramicIn)" />

        {/* coffee + crema */}
        <ellipse cx="200" cy="213" rx="92" ry="25" fill="#3A230F" />
        <ellipse cx="200" cy="211" rx="86" ry="22" fill="url(#crema2)" />
        <ellipse cx="182" cy="205" rx="30" ry="8" fill="#F0D89B" opacity=".45" />

        {/* rim highlight */}
        <path
          d="M104 210 A104 30 0 0 1 296 210"
          fill="none"
          stroke="#FFF8EC"
          strokeWidth="2.5"
          opacity=".6"
        />
      </svg>

      {/* rotating roast seal */}
      <svg className="seal" viewBox="0 0 100 100" aria-hidden="true">
        <defs>
          <path
            id="ring"
            d="M50 50 m -37 0 a 37 37 0 1 1 74 0 a 37 37 0 1 1 -74 0"
            fill="none"
          />
          <radialGradient id="cr3" cx="42%" cy="36%" r="72%">
            <stop offset="0%" stopColor="#F0CE87" />
            <stop offset="50%" stopColor="#C6892C" />
            <stop offset="100%" stopColor="#8E5C18" />
          </radialGradient>
        </defs>
        <circle cx="50" cy="50" r="48" fill="#241309" stroke="#C6892C" strokeWidth="1.5" />
        <circle cx="50" cy="50" r="22" fill="url(#cr3)" />
        <g transform="rotate(-12 50 50)">
          <ellipse cx="50" cy="50" rx="9" ry="13.5" fill="#241309" />
        </g>
        <text
          fontFamily="Inter,sans-serif"
          fontSize="8.4"
          fontWeight="700"
          letterSpacing="3.1"
          fill="#E6BB63"
        >
          <textPath href="#ring" startOffset="0%">
            · ROASTED TO ORDER · EST 2026{' '}
          </textPath>
        </text>
      </svg>

      {/* floating spec chip */}
      <div className="chip">
        <div className="dot">12</div>
        <div className="ct">
          <div className="a">12 oz, monthly</div>
          <div className="b">Ground to your brew</div>
        </div>
      </div>

      <Bean className="bean b1" size={34} rotate={24} fill="#3A230F" stroke="#C6892C" />
      <Bean className="bean b2" size={26} rotate={-30} fill="#43291A" stroke="#E6BB63" />
      <Bean className="bean b3" size={22} rotate={52} fill="#3A230F" stroke="#C6892C" />
    </div>
  )
}

function Bean({ className, size, rotate, fill, stroke }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 40 40" aria-hidden="true">
      <g transform={`rotate(${rotate} 20 20)`}>
        <ellipse cx="20" cy="20" rx="11" ry="16" fill={fill} />
        <path
          d="M20 6 C15 12 25 28 20 34"
          stroke={stroke}
          strokeWidth="1.6"
          fill="none"
          strokeLinecap="round"
        />
      </g>
    </svg>
  )
}
