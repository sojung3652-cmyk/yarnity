"use client";
// My Page's frame (web; components/my/MyLayout.tsx): the profile and menu on the left, the screen on the right.
import type { ReactNode } from "react";
import { MyLayout } from "@/components/my/MyLayout";

export default function MyPageLayout({ children }: { children: ReactNode }) {
  return <MyLayout>{children}</MyLayout>;
}
