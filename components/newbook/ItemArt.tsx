// Soft colour illustrations of the 19 items (Kim's pick: pastel shapes, rounded, a faint row of stitches,
// a soft shadow under each). Each item has its own pastel; `fill` (the yarn colour) replaces it in the
// big version on the right page. One ink tone (the pastel mixed with brown) for outlines and stitches.
import type { ItemId } from "@/lib/items";

const PASTEL: Record<ItemId, string> = {
  coaster: "#F4CFD3", scrubber: "#E7DBB4", trivet: "#F7CDB0", placemat: "#CBD8BF", rug: "#F9D8DF",
  basket: "#EBD7B8", planter: "#F7CDB0", pencil: "#CFE2F0", cupholder: "#F9D8DF",
  minibag: "#F9D8DF", bucket: "#F4CFD3", pouch: "#CFE2F0",
  scarf: "#F7CDB0", neckwarmer: "#CBD8BF", headband: "#F4CFD3",
  dishcloth: "#CFE2F0", bookmark: "#E7DBB4", blanket: "#F9D8DF", beanie: "#F4CFD3",
};
const LEAF = "#B5C9A4";

function shape(id: ItemId, c: string, ink: string, light: string) {
  const line = { fill: "none", stroke: ink, strokeLinecap: "round", strokeLinejoin: "round" } as const;
  // a row of stitches: short dashes along a path, a little lighter than the outline
  const st = (d: string, k = 0) => <path key={d + k} d={d} {...line} strokeDasharray="2.2 1.8" opacity=".55" />;
  const ring = (cx: number, cy: number, r: number, n: number, rr: number) => Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2; return <circle key={i} cx={cx + Math.cos(a) * r} cy={cy + Math.sin(a) * r} r={rr} fill={c} stroke={ink} />;
  });
  const shadow = (cx = 32, cy = 56, rx = 19) => <ellipse cx={cx} cy={cy} rx={rx} ry={2.4} fill="#5A4038" opacity=".09" stroke="none" />;
  switch (id) {
    case "coaster": return <>{shadow(32, 54, 20)}{ring(32, 31, 19, 18, 3.2)}<circle cx="32" cy="31" r="19" fill={c} stroke="none" />{st("M32 18a13 13 0 1 0 .01 0")}{st("M32 24a7 7 0 1 0 .01 0", 1)}<circle cx="32" cy="31" r="2" fill={ink} opacity=".35" stroke="none" /></>;
    case "scrubber": return <>{shadow(32, 55, 17)}<path d="M32 14v-4" {...line} /><circle cx="32" cy="8" r="2.6" {...line} />{ring(32, 34, 15, 12, 4.4)}<circle cx="32" cy="34" r="15" fill={c} stroke="none" />{st("M32 24a10 10 0 1 0 .01 0")}<circle cx="32" cy="34" r="4" fill={light} stroke="none" /></>;
    case "trivet": return <>{shadow(32, 55, 20)}<rect x="12" y="12" width="40" height="40" rx="8" fill={c} stroke={ink} />{st("M19 19h26v26H19z")}<rect x="26" y="26" width="12" height="12" rx="3" fill={light} stroke="none" />{st("M26 26h12v12H26z", 1)}</>;
    case "placemat": return <>{shadow(32, 51, 25)}<rect x="6" y="15" width="52" height="32" rx="16" fill={c} stroke={ink} />{st("M15 23h34")}{st("M13 31h38", 1)}{st("M15 39h34", 2)}</>;
    case "rug": return <>{shadow(32, 53, 27)}<ellipse cx="32" cy="32" rx="27" ry="18" fill={c} stroke={ink} /><ellipse cx="32" cy="32" rx="19" ry="12.5" fill={light} stroke="none" /><ellipse cx="32" cy="32" rx="11" ry="7" fill={c} stroke="none" />{st("M32 14.5a23 15.5 0 1 0 .01 0")}{st("M32 25a8 5 0 1 0 .01 0", 1)}</>;
    case "basket": return <>{shadow(32, 55, 20)}<path d="M11 24h42l-4 25a5 5 0 0 1-5 4H20a5 5 0 0 1-5-4z" fill={c} stroke={ink} /><rect x="9" y="20" width="46" height="7" rx="3.5" fill={light} stroke={ink} /><ellipse cx="16" cy="23.5" rx="2.4" ry="1.4" fill={ink} opacity=".35" stroke="none" /><ellipse cx="48" cy="23.5" rx="2.4" ry="1.4" fill={ink} opacity=".35" stroke="none" />{st("M15 34h34")}{st("M16 42h32", 1)}</>;
    case "planter": return <>{shadow(32, 55, 16)}<path d="M32 27c-1-8-7-13-14-13 1 8 7 12 14 13z" fill={LEAF} stroke={ink} /><path d="M32 27c0-9 6-15 14-16-1 9-6 15-14 16z" fill={LEAF} stroke={ink} /><path d="M32 27v-9" {...line} /><path d="M15 27h34l-4 24a4 4 0 0 1-4 3H23a4 4 0 0 1-4-3z" fill={c} stroke={ink} /><path d="M14 27h36" {...line} />{st("M17 36h30")}{st("M18 44h28", 1)}</>;
    case "pencil": return <>{shadow(32, 55, 15)}<path d="M24 26V12l2.5-4 2.5 4v14" fill="#E7DBB4" stroke={ink} /><path d="M31 26V9l2.5-4 2.5 4v17" fill="#F4CFD3" stroke={ink} /><path d="M38 26V14l2.5-4 2.5 4v12" fill={LEAF} stroke={ink} /><rect x="18" y="24" width="28" height="29" rx="5" fill={c} stroke={ink} />{st("M18 33h28")}{st("M18 41h28", 1)}</>;
    case "cupholder": return <>{shadow(30, 55, 15)}<path d="M18 12h24l-3 41H21z" fill="#FFFDF8" stroke={ink} /><path d="M42 24h3a6 6 0 0 1 0 12h-4" {...line} /><path d="M19.3 26h21.4l-1.4 17H20.7z" fill={c} stroke={ink} />{st("M20 32h20")}{st("M20.5 37.5h19", 1)}<path d="M23 8c0-2 2-2 2-4M29 8c0-2 2-2 2-4" {...line} opacity=".45" /></>;
    case "minibag": return <>{shadow(32, 56, 20)}<path d="M23 26c0-9 4-14 9-14s9 5 9 14" fill="none" stroke={ink} strokeWidth="3.2" strokeLinecap="round" /><path d="M23 26c0-9 4-14 9-14s9 5 9 14" fill="none" stroke={c} strokeWidth="1.6" strokeLinecap="round" /><path d="M12 25h40l-3 24a6 6 0 0 1-6 5H21a6 6 0 0 1-6-5z" fill={c} stroke={ink} /><path d="M12 25h40" stroke={ink} />{st("M14 33h36")}{st("M15 41h34", 1)}</>;
    case "bucket": return <>{shadow(32, 56, 18)}<path d="M18 22C16 8 48 8 46 22" {...line} /><path d="M15 20h34l-3 30a5 5 0 0 1-5 4H23a5 5 0 0 1-5-4z" fill={c} stroke={ink} /><ellipse cx="32" cy="20" rx="17" ry="3.5" fill={light} stroke={ink} />{st("M15.5 26h33")}<circle cx="27" cy="27" r="1.6" fill={ink} opacity=".5" stroke="none" /><circle cx="37" cy="27" r="1.6" fill={ink} opacity=".5" stroke="none" />{st("M17 38h30", 1)}{st("M18 46h28", 2)}</>;
    case "pouch": return <>{shadow(32, 53, 23)}<rect x="9" y="20" width="46" height="30" rx="9" fill={c} stroke={ink} /><path d="M12 27h40" {...line} strokeDasharray="1.2 1.4" /><path d="M44 27v7" {...line} /><rect x="42" y="33" width="4" height="6" rx="2" fill={light} stroke={ink} />{st("M15 37h22")}{st("M15 43h34", 1)}</>;
    case "scarf": return <>{shadow(32, 57, 15)}<path d="M20 8c8 3 16 3 24 0v12c-8 3-16 3-24 0z" fill={c} stroke={ink} /><path d="M24 20v28h12V21" fill={c} stroke={ink} />{st("M24 28h12")}{st("M24 35h12", 1)}{st("M24 42h12", 2)}<path d="M25 48v5M28 48v6M31 48v6M34 48v5" {...line} /></>;
    case "neckwarmer": return <>{shadow(32, 54, 20)}<path d="M13 20v22c0 5 8 8 19 8s19-3 19-8V20" fill={c} stroke={ink} /><ellipse cx="32" cy="20" rx="19" ry="6.5" fill={light} stroke={ink} /><ellipse cx="32" cy="20" rx="13" ry="3.6" fill="#FFFDF8" stroke={ink} opacity=".9" />{[18, 24, 30, 36, 42, 48].map(x => <path key={x} d={`M${x} ${x < 32 ? 26 - (32 - x) * 0.1 : 26 - (x - 32) * 0.1}v18`} {...line} opacity=".35" />)}</>;
    case "headband": return <>{shadow(32, 54, 19)}<path d="M12 40a20 22 0 0 1 40 0" fill="none" stroke={ink} strokeWidth="9.5" strokeLinecap="round" /><path d="M12 40a20 22 0 0 1 40 0" fill="none" stroke={c} strokeWidth="7.6" strokeLinecap="round" />{st("M14.5 37a17.5 19 0 0 1 35 0")}<path d="M26 14c3 3 9 3 12 0l-2 7c-3 2-5 2-8 0z" fill={light} stroke={ink} /></>;
    case "dishcloth": return <>{shadow(32, 55, 20)}<path d="M42 14c0-6 8-6 8 0" {...line} /><rect x="13" y="14" width="38" height="38" rx="4" fill={c} stroke={ink} />{st("M13 23h38")}{st("M13 31h38", 1)}{st("M13 39h38", 2)}<path d="M13 46h38" {...line} opacity=".3" /></>;
    case "bookmark": return <>{shadow(32, 57, 9)}<path d="M25 7h14v40l-7-5-7 5z" fill={c} stroke={ink} />{st("M25 15h14")}{st("M25 22h14", 1)}{st("M25 29h14", 2)}<path d="M32 42v5" {...line} /><path d="M30 47h4l1 7h-6z" fill={light} stroke={ink} /></>;
    case "blanket": return <>{shadow(32, 54, 25)}<path d="M8 14h48v28H8z" fill={c} stroke={ink} /><path d="M8 42c0 6 4 8 10 8h38V42" fill={light} stroke={ink} /><path d="M24 14v28M40 14v28M8 28h48" {...line} opacity=".35" />{st("M8 21h48")}{st("M8 35h48", 1)}</>;
    case "beanie": return <>{shadow(32, 55, 21)}<circle cx="32" cy="12" r="5" fill={light} stroke={ink} /><path d="M13 40c0-15 8-24 19-24s19 9 19 24z" fill={c} stroke={ink} />{st("M17 31h30")}{st("M22 23h20", 1)}<rect x="11" y="39" width="42" height="10" rx="4" fill={light} stroke={ink} />{[17, 22, 27, 32, 37, 42, 47].map(x => <path key={x} d={`M${x} 41v6`} {...line} opacity=".4" />)}</>;
  }
}

/** `line`: the same drawing as a plain line drawing (no colour fills), for the phone's item note; `stroke`:
 *  that line drawing's colour (the phone's 나의 도안집 covers draw it in a gold gradient). */
export function ItemArt({ id, big, fill, line, stroke }: { id: ItemId; big?: boolean; fill?: string; line?: boolean; stroke?: string }) {
  const c = line ? "transparent" : big && fill ? fill : PASTEL[id];
  const ink = line ? stroke ?? "#7A6C64" : `color-mix(in srgb, ${c} 45%, #6B4C40)`, light = line ? "transparent" : `color-mix(in srgb, ${c} 55%, #FFFFFF)`;
  return (
    <svg viewBox="0 0 64 64" className={big ? "nb-art nb-art-big" : "nb-art"} aria-hidden="true" strokeWidth={big ? 0.8 : 1.2}>
      {shape(id, c, ink, light)}
    </svg>
  );
}
