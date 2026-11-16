"use client";
// The book's buttons as small woven labels, like the label on the book's cover: cream weave, lavender
// stitches at both ends, a slight tilt (next -1deg, back +1deg) that straightens on hover.
// `blocked` keeps the button pressable (it then tells what is missing) but shows it faded.
import Link from "next/link";
import type { ReactNode } from "react";

type Props = { children: ReactNode; side: "next" | "back"; blocked?: boolean };

export function ClothLabel({ children, side, blocked, ...rest }: Props & ({ type: "submit" | "button"; onClick?: () => void; href?: never } | { href: string; type?: never; onClick?: never })) {
  const cls = `cloth-label cloth-${side}` + (blocked ? " is-blocked" : "");
  const inner = <span className="cloth-face">{children}</span>;
  if ("href" in rest && rest.href) return <Link className={cls} href={rest.href}>{inner}</Link>;
  const { type, onClick } = rest as { type: "submit" | "button"; onClick?: () => void };
  return <button type={type} className={cls} aria-disabled={blocked || undefined} onClick={onClick}>{inner}</button>;
}
