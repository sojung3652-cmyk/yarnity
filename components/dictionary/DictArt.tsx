// 뜨개 사전's line drawings in gold thread (web, Kim: D_trouble, D_projects): the 막힐 때 cards' pictures (wide,
// 200 x 60) and the 작품별 가이드 round badges (24 x 24). The data names them (trouble.illustration / compare.art,
// projects.icon); an unknown name draws nothing.
import type { ReactNode } from "react";

const W: Record<string, ReactNode> = {
  cup: <><path d="M52 20 Q100 54 148 20" /><path d="M52 20 Q100 11 148 20 Q100 29 52 20" strokeDasharray="3 3" strokeWidth="1.2" /></>,
  flat: <path d="M54 30 H146" />,
  wave: <path d="M58 32 q10 -14 20 0 t20 0 t20 0 t20 0 t20 0" />,
  dots: <><g fill="currentColor" stroke="none">{[0, 1, 2, 3, 4, 5, 6, 7].map(i => <circle key={i} cx={66 + i * 10} cy="38" r="2.6" />)}</g><path d="M135 17 l9 9 M144 17 l-9 9" strokeWidth="1.6" /></>,
  edges: <><path d="M86 12 V50" /><path d="M114 12 l5 6 -5 6 5 6 -5 6 5 6 -5 6" /></>,
  lean: <><path d="M62 47 H142" strokeDasharray="3 3" strokeWidth="1.2" /><path d="M72 47 Q88 26 132 13" /></>,
  drop: <><path d="M100 8 V30" /><path d="M93 30 q7 9 14 0" /><path d="M100 39 V54" strokeDasharray="3 3" strokeWidth="1.2" /></>,
  lines: <><path d="M68 24 H132 M68 31 H132 M68 38 H132" /><path d="M58 31 H64 M136 31 H142" /></>,
  join: <><circle cx="88" cy="32" r="12" /><path d="M100 32 q14 -1 28 -10" strokeDasharray="3 3" strokeWidth="1.2" /></>,
  ring: <><circle cx="96" cy="26" r="11" strokeDasharray="3 3" strokeWidth="1.3" /><path d="M103 35 q5 11 19 10" /></>,
};

const I: Record<string, ReactNode> = {
  bag: <><path d="M5 9h14l-1.2 11H6.2z" /><path d="M9 9V7a3 3 0 0 1 6 0v2" /></>,
  scarf: <><path d="M8 4h7v10l-3 6-4-1z" /><path d="M11.5 14V4" /></>,
  hat: <><path d="M4 17h16" /><path d="M6 17a6 5 0 0 1 12 0" /><circle cx="12" cy="8.5" r="1.2" /></>,
  doll: <><circle cx="12" cy="9" r="4" /><path d="M8 13.5c-1.5 1.2-2 3-2 5.5h12c0-2.5-.5-4.3-2-5.5" /><circle cx="8.5" cy="5.5" r="1.4" /><circle cx="15.5" cy="5.5" r="1.4" /></>,
  scrubber: <><circle cx="12" cy="12" r="7.5" /><circle cx="12" cy="12" r="3" /><path d="M4.5 12h15M12 4.5v15" /></>,
  sock: <path d="M9 3h5v9l3.5 3.5a2.6 2.6 0 0 1-3.7 3.7L8.5 14a2 2 0 0 1-.5-1.3z" />,
  coaster: <><rect x="5" y="5" width="14" height="14" rx="1" /><rect x="8.5" y="8.5" width="7" height="7" /></>,
  blanket: <><rect x="4" y="5" width="16" height="14" rx="1" /><path d="M4 9.7h16M4 14.3h16M9.3 5v14M14.7 5v14" /></>,
};

export function TroubleArt({ name, className }: { name: string; className?: string }) {
  return <svg className={className} viewBox="0 0 200 60" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{W[name]}</svg>;
}
export function ProjectIcon({ name, className }: { name: string; className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{I[name]}</svg>;
}
