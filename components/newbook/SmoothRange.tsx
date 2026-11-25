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
  /** an arrow key's own step (Kim: 크기는 무늬 단위로): the value one stop on in that direction, or null for the
   *  slider's usual step. A slider that stops only at a stitch pattern's repeats needs it - a key moves it by one
   *  `step`, and where that is less than half the way to the next stop the value fell back to where it was. */
  nudge?: (dir: 1 | -1) => number | null;
};

export function SmoothRange({ value, onValue, nudge, ...rest }: Props) {
  const [own, setOwn] = useState<string | null>(null), [pending, start] = useTransition();
  useEffect(() => { if (!pending) setOwn(null); }, [pending]);
  const go = (n: number, raw: string) => { setOwn(raw); start(() => onValue(n, raw)); };
  return <input type="range" {...rest} value={own ?? value} onChange={e => go(Number(e.target.value), e.target.value)}
    onKeyDown={e => {
      const d = e.key === "ArrowRight" || e.key === "ArrowUp" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowDown" ? -1 : 0, to = d && nudge ? nudge(d) : null;
      if (to != null) { e.preventDefault(); go(to, String(to)); }
      rest.onKeyDown?.(e);
    }} />;
}
