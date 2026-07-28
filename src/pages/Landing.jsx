import { Link } from 'react-router-dom'
import { Nav } from '../components/Nav.jsx'
import { Footer } from '../components/Footer.jsx'
import { ProductFrame } from '../components/ProductFrame.jsx'
import { PLAN, formatMoney } from '../lib/plan.js'
import { useReveal } from '../lib/useReveal.js'
import '../styles/landing.css'

const RITUAL = [
  {
    n: '01',
    title: 'Edited to one origin',
    body: 'One lot at a time. No menu sprawl, no blend filler, no mystery harvest hiding behind romantic copy.',
  },
  {
    n: '02',
    title: 'Roasted after you order',
    body: 'Your bag is roasted the morning it ships, so it arrives while the coffee is still opening up.',
  },
  {
    n: '03',
    title: 'Prepared for your ritual',
    body: 'Whole bean or ground precisely for your setup. The coffee adapts to the way your morning actually works.',
  },
]

// CC0 photo by Skitterphoto, sourced from Wikimedia Commons/Pixabay.
// https://commons.wikimedia.org/wiki/File:Beans_(42182293175).jpg
const HERO_PHOTO = '/images/coffee-beans-hero.jpg'
// CC0 photo by Pixel.la, sourced from Wikimedia Commons/Flickr.
// https://commons.wikimedia.org/wiki/File:A_lot_of_coffee_beans.jpg
const PILE_PHOTO = '/images/coffee-beans-pile.jpg'

export default function Landing() {
  useReveal()

  return (
    <>
      {/* ---------- HERO ---------- */}
      <header className="wrap">
        <Nav />
      </header>

      <main id="main">
        <section className="hero wrap">
          <div className="hero-copy">
            <span className="eyebrow">Monthly release · Huila, Colombia</span>
            <h1 className="hero-title">
              Coffee,
              <br />
              considered.
            </h1>
            <p className="hero-lede">
              One exceptional single-origin release each month. Roasted after you order, prepared
              for your brew, and shipped with nothing extra to explain.
            </p>

            <p className="hero-taste">
              <span>Cocoa</span>
              <span>Dried fig</span>
              <span>Caramel finish</span>
            </p>
          </div>

          <div className="hero-visual">
            <div className="hero-photo-shell">
              <ProductFrame
                ratio={null}
                tone="dark"
                className="hero-frame"
                src={HERO_PHOTO}
                alt="Roasted coffee beans in warm directional light"
                priority
              />
            </div>
            <div className="hero-photo-caption" aria-label="Current coffee release">
              <span>Current release</span>
              <strong>Finca La Esperanza</strong>
              <em>12 oz · washed · medium roast</em>
            </div>
          </div>

          {/* A sibling of the copy and the visual rather than nested inside the
              copy, so the grid can place it under the photo on a phone and
              beside it on desktop without duplicating any markup. */}
          <div className="hero-actions">
            <Link to="/checkout" className="btn btn-primary lg hero-cta">
              Order the release
              <Arrow />
            </Link>
            <span className="hero-price">
              <strong>{formatMoney(PLAN.amountCents)}</strong>/month · free shipping
            </span>
          </div>
        </section>
      </main>

      <section className="signature wrap reveal" aria-label="Release promise">
        <p>Roasted only after you ask for it.</p>
        <dl>
          <div>
            <dt>Origin</dt>
            <dd>{PLAN.spec.origin}</dd>
          </div>
          <div>
            <dt>Roast window</dt>
            <dd>Ships within 48 hours</dd>
          </div>
          <div>
            <dt>Format</dt>
            <dd>Whole bean or ground</dd>
          </div>
        </dl>
      </section>

      {/* ---------- RITUAL: editorial, no cards ---------- */}
      <section className="ritual wrap" id="ritual">
        <div className="ritual-head reveal">
          <span className="eyebrow">The standard</span>
          <h2 className="section-title">
            Designed for the part of the day
            <br />
            that should feel <em>effortless.</em>
          </h2>
          <p className="lede ritual-lede">
            The product is not a giant catalog. It is a decision made well: one release, one roast
            window, one clear path to better coffee at home.
          </p>
        </div>

        <ol className="ritual-list">
          {RITUAL.map((step) => (
            <li className="ritual-item reveal" key={step.n}>
              <span className="ritual-num">{step.n}</span>
              <div className="ritual-body">
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* ---------- TASTING BAND: full-bleed dark ---------- */}
      <section className="tasting bleed onDark" id="roast">
        <div className="wrap tasting-inner">
          <div className="tasting-copy reveal">
            <span className="eyebrow eyebrow--onDark">This month’s release</span>
            <h2 className="section-title">
              Finca La Esperanza.
              <br />
              <em>Clean, deep, composed.</em>
            </h2>
            <p className="lede">
              Grown at 1,750 metres in Huila and washed on the farm. It opens with cocoa and dried
              fig, then settles into a long caramel finish.
            </p>
            <dl className="tasting-spec">
              <div>
                <dt>Origin</dt>
                <dd>{PLAN.spec.origin}</dd>
              </div>
              <div>
                <dt>Process</dt>
                <dd>Washed</dd>
              </div>
              <div>
                <dt>Roast</dt>
                <dd>{PLAN.spec.roast}</dd>
              </div>
              <div>
                <dt>Altitude</dt>
                <dd>1,750 m</dd>
              </div>
            </dl>
          </div>

          <ProductFrame
            ratio="1 / 1"
            tone="dark"
            className="tasting-media reveal"
            src={PILE_PHOTO}
            alt="A massive pile of roasted coffee beans"
          />
        </div>
      </section>

      <section className="product-philosophy wrap reveal">
        <p>
          No quiz. No sampler chaos. No stale inventory dressed up as discovery.
          <span> Just one excellent bag, handled properly.</span>
        </p>
      </section>

      {/* ---------- PLAN: the one card on the page ---------- */}
      <section className="plan wrap" id="plan">
        <div className="plan-copy reveal">
          <span className="eyebrow">One plan</span>
          <h2 className="section-title">
            The <em>Monthly Kick.</em>
          </h2>
          <p className="lede plan-lede">
            A 12 oz bag of single-origin coffee, roasted to order and shipped every month. Clean
            enough to understand in ten seconds. Good enough to keep.
          </p>
          <dl className="plan-meta">
            <div>
              <dt>Ships</dt>
              <dd>Every month, free</dd>
            </div>
            <div>
              <dt>Commitment</dt>
              <dd>None. Skip or cancel anytime</dd>
            </div>
            <div>
              <dt>Roast</dt>
              <dd>Medium, rotating single origin</dd>
            </div>
          </dl>
        </div>

        <div className="plan-card reveal">
          <span className="plan-badge">Flagship release</span>
          <h3 className="plan-name">{PLAN.name}</h3>
          <div className="plan-price">
            <span className="plan-amount">{formatMoney(PLAN.amountCents)}</span>
            <span className="plan-cadence">/ {PLAN.cadence}</span>
          </div>
          <p className="plan-blurb">{PLAN.blurb}</p>

          <ul className="plan-features">
            {PLAN.features.map((feature) => (
              <li key={feature}>
                <Check />
                {feature}
              </li>
            ))}
          </ul>

          <Link to="/checkout" className="btn btn-primary lg btn-block">
            Order the release
            <Arrow />
          </Link>
          <p className="plan-fine">
            Billed today as a single {formatMoney(PLAN.amountCents)} charge. Cards handled by
            Hyperswitch — we never see your details.
          </p>
        </div>
      </section>

      {/* ---------- CLOSER ---------- */}
      <section className="closer wrap reveal" id="journal">
          <h2 className="section-title">
          Better mornings,
          <br />
          <em>without the noise.</em>
        </h2>
        <Link to="/checkout" className="btn btn-primary lg">
          Order the Monthly Kick — {formatMoney(PLAN.amountCents)}/mo
          <Arrow />
        </Link>
        <p className="closer-fine">Free shipping · Skip or cancel anytime · No account needed</p>
      </section>

      <div className="wrap">
        <Footer />
      </div>
    </>
  )
}

function Check() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M20 6L9 17l-5-5"
        stroke="var(--crema-lo)"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function Arrow() {
  return (
    <svg className="btn-arrow" width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M5 12h13m0 0l-5.5-5.5M18 12l-5.5 5.5"
        stroke="currentColor"
        strokeWidth="2.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
