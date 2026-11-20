"use client";
// Girl's Diary buttons, shared by the web and the phone (Kim): the images are public/mobile/diary.
//   <LaceButton variant="mocha|lavender">  a satin band with a slim lace edge (900 x 264); the words on the
//      satin (9% in from each side, 24% top, 23% bottom). variant="white": the ivory name tag (900 x 418, satin
//      15% / 31% / 30%). No background or shadow of their own: the page shows through the lace's mesh.
//      Hover: 2px up. Press: .98.
//   <ClothPatch color="yellow|cream|pink|lavender">  a frayed cloth patch with running stitches (the patch
//      image is the whole button: border-image with fill; no painted box behind the words).
//   <StitchButton icon label>  a small round cloth button: linen, a dashed stitch ring, an icon and a word.
// Each renders a <button>, or a next/link <Link> when given `href`. Styles: components/diary/diary.css.
import Link from "next/link";
import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from "react";
import "./diary.css";

type Common = { href?: string; className?: string; style?: CSSProperties; children?: ReactNode } & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "style" | "className" | "children">;

function Base({ href, className, style, children, type = "button", ...rest }: Common) {
  if (href) {
    const { id, onClick, "aria-label": al } = rest as { id?: string; onClick?: () => void; "aria-label"?: string };
    return <Link href={href} id={id} className={className} style={style} aria-label={al} onClick={onClick}>{children}</Link>;
  }
  return <button type={type} className={className} style={style} {...rest}>{children}</button>;
}

/** a slim lace button (mocha, lavender: 900:264) or the name tag (white: 900:418); `width` in px, or
 *  "fill" for the room it is given (the phone's foot bars); the height follows the image */
export function LaceButton({ variant, width, className = "", style, children, ...rest }: Common & { variant: "white" | "mocha" | "lavender"; width: number | "fill" }) {
  return (
    <Base className={`dlace dlace-${variant}${width === "fill" ? " is-fill" : ""} ${className}`} style={{ ...style, ...(width === "fill" ? {} : { ["--lw" as string]: `${width}px` }) }} {...rest}>
      <span className="dlace-satin">{children}</span>
    </Base>
  );
}

/** the same lace tag around something that is not a button (the name tag's input) */
export function LaceTag({ variant, width, className = "", children }: { variant: "white" | "mocha" | "lavender"; width: number; className?: string; children: ReactNode }) {
  return <div className={`dlace dlace-${variant} is-tag ${className}`} style={{ ["--lw" as string]: `${width}px` }}><div className="dlace-satin">{children}</div></div>;
}

/** a frayed cloth patch; `small` for the header's little labels (12px edge) */
export function ClothPatch({ color, small, className = "", children, ...rest }: Common & { color: "yellow" | "cream" | "pink" | "lavender"; small?: boolean }) {
  return <Base className={`dpatch dpatch-${color}${small ? " is-small" : ""} ${className}`} {...rest}>{children}</Base>;
}

/** a round cloth button with an icon and a word under it */
export function StitchButton({ icon, label, className = "", ...rest }: Common & { icon: ReactNode; label: string }) {
  return (
    <Base className={`dstitch ${className}`} {...rest}>
      <span className="dstitch-disc" aria-hidden="true">{icon}</span>
      <span className="dstitch-label">{label}</span>
    </Base>
  );
}

const I = { width: 17, height: 17, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round", strokeLinejoin: "round" } as const;
/** icons for StitchButton: pen (고치기), printer (인쇄), undo (되돌리기) */
export const DiaryIcon = {
  pen: <svg {...I}><path d="m14.5 5.5 4 4L8 20H4v-4L14.5 5.5Z" /><path d="m12.5 7.5 4 4" /></svg>,
  print: <svg {...I}><path d="M7 9V4h10v5" /><rect x="4" y="9" width="16" height="7" rx="1.5" /><path d="M7 14h10v6H7z" /></svg>,
  undo: <svg {...I}><path d="M9 7 5 11l4 4" /><path d="M5 11h9a5 5 0 0 1 0 10h-3" /></svg>,
};
