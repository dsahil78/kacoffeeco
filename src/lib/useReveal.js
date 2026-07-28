import { useEffect } from 'react'

/**
 * Reveals `.reveal` elements as they scroll into view.
 *
 * One observer for the whole page rather than one per element, and each element
 * is unobserved once shown — revealing is a one-way trip, so there is no reason
 * to keep watching it.
 *
 * If the viewer prefers reduced motion, or IntersectionObserver is missing, the
 * elements are shown immediately. Content must never depend on animation to
 * become visible.
 */
export function useReveal(deps = []) {
  useEffect(() => {
    const nodes = document.querySelectorAll('.reveal:not(.is-in)')
    if (!nodes.length) return undefined

    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reduced || typeof IntersectionObserver === 'undefined') {
      nodes.forEach((node) => node.classList.add('is-in'))
      return undefined
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return
          entry.target.classList.add('is-in')
          observer.unobserve(entry.target)
        })
      },
      // Fire a little before the element reaches the fold so the motion has
      // finished by the time it is properly in view.
      { rootMargin: '0px 0px -12% 0px', threshold: 0.08 },
    )

    nodes.forEach((node) => observer.observe(node))
    return () => observer.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
}
