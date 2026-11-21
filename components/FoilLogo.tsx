"use client";
// The Yarnity wordmark (Kim): embroidered in fine gold thread, the yarn ball and the star sewn with it
// (public/pic/yarnity-gold.webp, 1412 x 499, transparent). Everywhere the logo shows, web and phones: the nav,
// the home (with its own INTELLIGENT CROCHET line under it, kept as text: in the picture that line would be
// about 4-6px at the logo's sizes), the book's page, the phone bars, the AI's /ai sidebar, the footer.
// It replaced the debossed gold-foil SVG; the name stays so every place keeps using it as before. Its box has
// the picture's own shape (2.83 : 1), so the 3D book, which paints its pages onto a canvas from the DOM
// (Book/three/pagePaint.ts draws an <img> into its box), shows it unstretched.

/** `shine` is kept for the callers; the embroidered picture has no foil shine to animate. */
export function FoilLogo({ className = "pg-foil" }: { className?: string; shine?: boolean }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img className={className} src="/pic/yarnity-gold.webp" alt="" aria-hidden="true" width={1412} height={499} draggable={false} />;
}
