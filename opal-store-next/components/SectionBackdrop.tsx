/**
 * Ambient photographic backdrop for a full-width section.
 *
 * Sits behind the section's content at z-0 with a heavy scrim over it, so the
 * photo reads as texture rather than a picture. That matters more than it used
 * to: product cards are transparent now, so the image shows THROUGH them as
 * well as around them, and every title sits directly on it with no background
 * of its own. Hence the scrim default well above half.
 *
 * Render inside a `relative` section and give the content `relative z-[1]`.
 */

interface Props {
  /** Already-resolved URL. Falsy renders nothing, leaving the plain background. */
  image?: string | null
  /** 0–100. Higher darkens more; the default keeps gold type comfortably legible. */
  scrim?: number
  /** CSS object-position — the admin's dragged focal point, so the subject isn't hidden behind the cards. */
  position?: string
}

export default function SectionBackdrop({
  image,
  scrim = 78,
  position = 'center',
}: Props) {
  if (!image) return null

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      {/* Plain <img> rather than next/image: this is a decorative full-bleed
          backdrop, and object-position needs to stay easy to tune. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={image}
        alt=""
        className="h-full w-full object-cover"
        style={{ objectPosition: position }}
      />
      <div
        className="absolute inset-0 bg-black"
        style={{ opacity: scrim / 100 }}
      />
      {/* Feather the top and bottom edges so the section melts into the
          neighbouring black rather than ending on a hard seam. Sized as a
          share of the section rather than a fixed 96px, so it stays in step
          with the section background's own fade (see .section-soft) instead of
          finishing well before it on a tall section. */}
      <div className="absolute inset-x-0 top-0 h-[28%] bg-gradient-to-b from-black to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-[28%] bg-gradient-to-t from-black to-transparent" />
    </div>
  )
}
