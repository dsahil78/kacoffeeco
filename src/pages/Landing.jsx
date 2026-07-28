import { Link } from 'react-router-dom'
import { Nav } from '../components/Nav.jsx'
import { Footer } from '../components/Footer.jsx'
import { TrustStrip } from '../components/TrustStrip.jsx'
import { HeroVisual } from '../components/HeroVisual.jsx'
import { PLAN, formatMoney } from '../lib/plan.js'
import '../styles/landing.css'

const RITUAL = [
  {
    n: '01',
    title: 'One bean, chosen properly',
    body: 'We buy a single lot at a time and stay with it until it is gone. No blends built to hide a bad harvest, no mystery origins.',
  },
  {
    n: '02',
    title: 'Roasted the morning it ships',
    body: 'Your bag is roasted the day it leaves us, so it reaches your counter inside 48 hours — while the beans are still doing their best work.',
  },
  {
    n: '03',
    title: 'Ground for how you actually brew',
    body: 'Tell us the brew method and we grind to match. Change your mind next month, or take it whole bean. It is your morning.',
  },
]

export default function Landing() {
  return (
    <>
      <div className="wrap">
        <Nav />

        <main id="main">
          <section className="hero">
            <div className="hero-copy">
              <span className="eyebrow">Roasted to order · Monthly</span>
              <h1>
                Mornings,
                <br />
                meet your <em>match.</em>
              </h1>
              <p className="lede">
                Single-origin beans, roasted the day we ship and ground for your brew. One plan, no
                fuss, seriously good coffee on your counter every month.
              </p>
              <div className="hero-actions">
                <Link to="/checkout" className="btn btn-primary lg">
                  Get the Monthly Kick
                </Link>
                <div className="price-tag">
                  <span className="amt">
                    {formatMoney(PLAN.amountCents)}
                    <span className="per">/mo</span>
                  </span>
                  <span className="lbl">Skip or cancel anytime</span>
                </div>
              </div>
              <div className="proof">
                <div>
                  <div className="stars" aria-hidden="true">
                    ★★★★★
                  </div>
                  <div className="p-cap">Rated 4.9 by early sippers</div>
                </div>
                <div className="divider" />
                <div>
                  <div className="p-num">48 hrs</div>
                  <div className="p-cap">Roast to doorstep</div>
                </div>
                <div className="divider" />
                <div>
                  <div className="p-num">12 oz</div>
                  <div className="p-cap">Specialty grade</div>
                </div>
              </div>
            </div>

            <HeroVisual />
          </section>
        </main>
      </div>

      <TrustStrip />

      <div className="wrap">
        {/* ---------- WHY ---------- */}
        <section className="ritual" id="ritual">
          <div className="ritual-head">
            <span className="eyebrow">Why the Monthly Kick</span>
            <h2 className="section-title">
              Good coffee is not complicated.
              <br />
              It is just <em>done properly.</em>
            </h2>
            <p className="ritual-lede">
              Most subscriptions bury you in choices, then ship beans that were roasted a month ago.
              We went the other way: one plan, one great lot at a time, roasted the day it ships.
            </p>
          </div>

          <div className="ritual-grid" id="roast">
            {RITUAL.map((step) => (
              <article className="ritual-card" key={step.n}>
                <span className="ritual-num">{step.n}</span>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </article>
            ))}
          </div>
        </section>

        {/* ---------- PLAN ---------- */}
        <section className="plan" id="plan">
          <div className="plan-copy">
            <span className="eyebrow">One plan, that is it</span>
            <h2 className="section-title">
              The <em>Monthly Kick.</em>
            </h2>
            <p className="plan-lede">
              A 12 oz bag of single-origin, roasted to order and on your counter every month. No
              tiers to compare, no upsells waiting at checkout — just the good stuff, on repeat.
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

          <div className="plan-card">
            <div className="plan-card-top">
              <span className="plan-badge">Most people start here</span>
              <h3 className="plan-name">{PLAN.name}</h3>
              <div className="plan-price">
                <span className="plan-amount">{formatMoney(PLAN.amountCents)}</span>
                <span className="plan-cadence">/ {PLAN.cadence}</span>
              </div>
              <p className="plan-blurb">{PLAN.blurb}</p>
            </div>

            <ul className="plan-features">
              {PLAN.features.map((feature) => (
                <li key={feature}>
                  <Check />
                  {feature}
                </li>
              ))}
            </ul>

            <Link to="/checkout" className="btn btn-primary lg btn-block">
              Start the Kick
            </Link>
            <p className="plan-fine">
              Billed today as a single {formatMoney(PLAN.amountCents)} charge. Cards handled by
              Hyperswitch — we never see your details.
            </p>
          </div>
        </section>

        {/* ---------- CLOSER ---------- */}
        <section className="closer" id="journal">
          <h2 className="section-title">Tomorrow morning could be considerably better.</h2>
          <Link to="/checkout" className="btn btn-dark lg">
            Get the Monthly Kick — {formatMoney(PLAN.amountCents)}/mo
          </Link>
        </section>

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
        stroke="#A66E1E"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
