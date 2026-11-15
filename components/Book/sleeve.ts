import type { CSSProperties } from "react";

// thin sleeve thickness under each cover: a few matte rounded layers
// (prototype: sleeveSlices(); now returns props instead of inserting DOM nodes)
export function sleeveSlices(n: number, topClass?: string): { className: string; style: CSSProperties }[] {
  return Array.from({ length: n }, (_, i) => {
    const t = n === 1 ? 0 : i / (n - 1);
    return {
      className: "sl" + (i === n - 1 && topClass ? " " + topClass : ""),
      style: {
        inset: (.8 * Math.abs(2 * t - 1)).toFixed(1) + "px",
        transform: `translateZ(calc(var(--C) * ${(.15 + .7 * t).toFixed(2)}))`, // never coplanar with a face
        backgroundColor: `hsl(263 ${30 + 4 * t}% ${(62 + 10 * t).toFixed(1)}%)`,
      },
    };
  });
}
