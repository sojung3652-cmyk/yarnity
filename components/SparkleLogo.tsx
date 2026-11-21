"use client";
// The top bars' Yarnity wordmark with a little life (Kim): the thin gold logo (public/brand/logo_small.webp,
// 1500 x 437) with a soft light sweeping across its letters every 6s and three tiny star glints on its
// strokes. Used by the web nav and the phone top bar only; the opening draws its own glinting logo.
// The box takes its width from the caller's class (the same widths the plain logo had), its height from
// the picture's shape. Reduced motion: the logo alone, still.
import "./SparkleLogo.css";

export function SparkleLogo({ className = "" }: { className?: string }) {
  return (
    <span className={"ylogo " + className}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand/logo_small.webp" alt="Yarnity" width={1500} height={437} draggable={false} />
      <i /><i /><i />
    </span>
  );
}
