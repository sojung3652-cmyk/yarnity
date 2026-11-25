"use client";
// A slider whose thumb never waits for the page (Kim, 11/25: 렉은 안 된다). Dragging one used to redraw the whole
// 도안 만들기 screen at every step of the drag before the thumb could move on - 50 to 70ms each, so it dragged
// in jerks. Here the thumb follows the pointer at once (its own value while it is dragged), and what the value
// changes is worked out as a transition: React does it in small pieces between frames, the newest value winning.
// When the page has caught up, the slider shows the page's value again (so a value the page limits snaps back).
import { useEffect, useState, useTransition, type InputHTMLAttributes } from "react";

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "value" | "onChange"> & {
  value: number | string;
  /** the value dragged to: as a number, and as the input wrote it */
  onValue: (n: number, raw: string) => void;
};

export function SmoothRange({ value, onValue, ...rest }: Props) {
  const [own, setOwn] = useState<string | null>(null), [pending, start] = useTransition();
  useEffect(() => { if (!pending) setOwn(null); }, [pending]);
  return <input type="range" {...rest} value={own ?? value} onChange={e => { const raw = e.target.value; setOwn(raw); start(() => onValue(Number(raw), raw)); }} />;
}
