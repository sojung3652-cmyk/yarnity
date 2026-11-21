"use client";
// Moving between pages (Kim: natural and refined): the page left fades out (0.18s), the new one rises 12px
// and fades in (0.32s). A template mounts anew on every navigation (a layout does not), so its ViewTransition
// enters and exits each time. The motion is in components/mobile/motion.css (phones rise; wide
// screens fade out and in).
import { ViewTransition, type ReactNode } from "react";

export default function Template({ children }: { children: ReactNode }) {
  return <ViewTransition enter="page-rise" exit="page-leave" default="none">{children}</ViewTransition>;
}
