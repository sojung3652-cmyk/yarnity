// 뜨개 사전's line drawings in gold thread (web) and the care-label symbols for 기타. TroubleArt is no longer shown
// (FAQ is text only now); the drawings stay for later use. An unknown name draws nothing.
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

export function TroubleArt({ name, className }: { name: string; className?: string }) {
  return <svg className={className} viewBox="0 0 200 60" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{W[name]}</svg>;
}

// care-label symbols (ISO 3758 shapes, drawn here): wash tub, bleach triangle, drying square, iron, professional-care circle
const TUB = <><path d="M6 11 L9.5 28 H30.5 L34 11" /><path d="M4 11 q3.5 -4 7 0 t7 0 t7 0 t7 0 t7 0" /></>;
const SQ = <rect x="6" y="5" width="28" height="24" rx="1" />;
const IRON = <path d="M8 26 H33 L33 19 C33 13 29 11 24 11 H15 C14 11 13 12 12.6 13 Z" />;
const X = <path d="M5 4 L35 30 M35 4 L5 30" />;
const dot = (x: number, y: number) => <circle key={x} cx={x} cy={y} r="1.5" fill="currentColor" stroke="none" />;
const C: Record<string, ReactNode> = {
  "wash-30": <>{TUB}<text x="20" y="24" textAnchor="middle" fontSize="9" fill="currentColor" stroke="none" fontFamily="serif">30</text></>,
  "wash-hand": <>{TUB}<path d="M17 25 v-7 M19.5 25 v-8 M22 25 v-7 M24.5 25 v-5 M17 25 q4 3 7.5 0" strokeWidth="1.2" /></>,
  "wash-gentle": <>{TUB}<text x="20" y="24" textAnchor="middle" fontSize="9" fill="currentColor" stroke="none" fontFamily="serif">30</text><path d="M9 31.5 H31" /></>,
  "wash-no": <>{TUB}{X}</>,
  "bleach": <path d="M20 5 L35 29 H5 Z" />,
  "bleach-oxygen": <><path d="M20 5 L35 29 H5 Z" /><path d="M17 27 L25 12 M21 27 L28.5 14" strokeWidth="1.2" /></>,
  "bleach-no": <><path d="M20 5 L35 29 H5 Z" />{X}</>,
  "tumble-1": <>{SQ}<circle cx="20" cy="17" r="9" />{dot(20, 17)}</>,
  "tumble-no": <>{SQ}<circle cx="20" cy="17" r="9" />{X}</>,
  "dry-flat": <>{SQ}<path d="M11 17 H29" /></>,
  "dry-line": <>{SQ}<path d="M6 9 q14 8 28 0" /></>,
  "iron-1": <>{IRON}{dot(22, 19)}</>,
  "iron-no": <>{IRON}{X}</>,
  "dryclean-p": <><circle cx="20" cy="17" r="12" /><text x="20" y="21.5" textAnchor="middle" fontSize="12" fill="currentColor" stroke="none" fontFamily="serif">P</text></>,
  "dryclean-no": <><circle cx="20" cy="17" r="12" />{X}</>,
};
export function CareIcon({ name, className }: { name: string; className?: string }) {
  return <svg className={className} viewBox="0 0 40 34" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" role="img" aria-hidden="true">{C[name]}</svg>;
}
