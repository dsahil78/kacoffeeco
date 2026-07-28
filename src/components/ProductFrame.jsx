/**
 * A photo-ready image slot.
 *
 * Every product visual on the site sits in one of these. Today they hold custom
 * SVG artwork; when real photography arrives, pass `src` instead of children
 * and nothing else changes — the frame already owns the aspect ratio, the
 * rounding, the lighting treatment and the object-fit, so the layout cannot
 * shift when illustration becomes photograph.
 *
 *   <ProductFrame ratio="4 / 5" tone="dark"><HeroScene /></ProductFrame>
 *   <ProductFrame ratio="4 / 5" tone="dark" src={heroPhoto} alt="…" />
 */
export function ProductFrame({
  ratio = '1 / 1',
  tone = 'dark',
  className = '',
  src,
  alt = '',
  priority = false,
  children,
}) {
  return (
    <figure
      className={`pframe pframe--${tone} ${className}`.trim()}
      // Pass ratio={null} to hand the crop entirely to CSS. Anything inline —
      // aspect-ratio or a custom property — outranks every stylesheet rule, so
      // a frame that needs to re-crop per breakpoint (the hero does) cannot
      // declare its ratio here.
      style={ratio ? { '--pframe-ratio': ratio } : undefined}
    >
      {src ? (
        <img
          src={src}
          alt={alt}
          className="pframe-media"
          // Above-the-fold art loads eagerly; everything below defers so it
          // never competes with the checkout path.
          loading={priority ? 'eager' : 'lazy'}
          fetchPriority={priority ? 'high' : 'low'}
          decoding="async"
        />
      ) : (
        children
      )}
    </figure>
  )
}
