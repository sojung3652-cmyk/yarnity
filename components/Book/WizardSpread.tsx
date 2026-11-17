"use client";
// 도안 만들기 inside the one 3D book: the very same two pages as the one-page /new (useNewBook in
// components/newbook/NewBook.tsx: progress, question, inputs, folds, woven labels, folios, the gold
// ribbon), laid on the book's left and right page boxes (the same DOM boxes the home menu uses).
// Each page is its own <form> with the same submit / Enter handling, since the two boxes are separate
// DOM trees. The pages are laid out at the original page's width (REF_W) and zoomed to the box: zoom
// re-lays the text at the final size (no transform scaling), so the composition is the same at any size.
import { createPortal } from "react-dom";
import { useNewBook } from "@/components/newbook/NewBook";
import { PAGE_H_PX, PAGE_PX } from "./three/paperTextures";

/** one page of the original /new book on a 1440px-wide screen: (1320 - 2 * 18) / 2 */
export const REF_W = 642;

export function WizardSpread({ left, right }: { left: HTMLElement; right: HTMLElement }) {
  const v = useNewBook();
  if (!v.ready) return null;
  const zoom = PAGE_PX / REF_W;
  const style = { zoom, width: REF_W, height: PAGE_H_PX / zoom } as React.CSSProperties;
  const form = (side: "l" | "r", children: React.ReactNode) => (
    <form className={"nb-book nb-in3d nb-in3d-" + side} style={style} noValidate onSubmit={v.onSubmit} onKeyDown={v.onKeyDown}>{children}</form>
  );
  return (
    <>
      {createPortal(form("l", v.left), left)}
      {createPortal(form("r", <>{v.ribbon}{v.right}</>), right)}
    </>
  );
}
