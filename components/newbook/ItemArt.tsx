// Line drawings of the 19 items: simple shapes only, one stroke weight (1.4px at card size), one style.
// `fill` (the yarn colour) tints the main body lightly in the big version.
import type { ItemId } from "@/lib/items";

const P = { fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round" } as const;

function shape(id: ItemId, f: string) {
  const dots = (d: string) => <path d={d} strokeDasharray="2 3.5" />;
  switch (id) {
    case "coaster": return <><circle cx="32" cy="32" r="20" fill={f} />{dots("M32 18a14 14 0 1 0 0.01 0")}<circle cx="32" cy="32" r="6" /></>;
    case "scrubber": return <><circle cx="32" cy="34" r="17" fill={f} />{dots("M32 23a11 11 0 1 0 0.01 0")}<path d="M32 17v-5" /><circle cx="32" cy="10" r="2.5" /></>;
    case "trivet": return <><rect x="13" y="13" width="38" height="38" rx="5" fill={f} />{dots("M20 20h24v24H20z")}{dots("M27 27h10v10H27z")}</>;
    case "placemat": return <><rect x="8" y="17" width="48" height="30" rx="15" fill={f} />{dots("M16 24h32M16 32h32M16 40h32")}</>;
    case "rug": return <><ellipse cx="32" cy="32" rx="26" ry="18" fill={f} />{dots("M32 19a19 13 0 1 0 0.01 0")}{dots("M32 26a10 6 0 1 0 0.01 0")}</>;
    case "basket": return <><path d="M12 24h40l-4 26a4 4 0 0 1-4 3H20a4 4 0 0 1-4-3z" fill={f} /><ellipse cx="32" cy="24" rx="20" ry="4" />{dots("M14 34h36M15 43h34")}</>;
    case "planter": return <><path d="M16 26h32l-4 26H20z" fill={f} />{dots("M17 35h30M18 44h28")}<path d="M32 26c0-7-6-11-11-11 1 6 5 10 11 11M32 26c0-8 5-13 11-13-1 7-5 12-11 13" /></>;
    case "pencil": return <><path d="M20 26h24v26H20z" fill={f} />{dots("M20 34h24M20 42h24")}<path d="M25 26 27 10l2 4M36 26l1-14 2 3M30 26l-2-10" /></>;
    case "cupholder": return <><path d="M18 18h24l-3 34H21z" fill={f} /><path d="M42 26h4a5 5 0 0 1 0 10h-5" />{dots("M19 28h22M20 38h20")}</>;
    case "minibag": return <><path d="M24 26c0-8 4-12 8-12s8 4 8 12" /><path d="M14 26h36l-3 26H17z" fill={f} />{dots("M15 35h34M16 44h32")}</>;
    case "bucket": return <><path d="M16 12c4 10 28 10 32 0" /><path d="M16 20h32l-3 32H19z" fill={f} /><ellipse cx="32" cy="20" rx="16" ry="3.5" />{dots("M17 31h30M18 42h28")}</>;
    case "pouch": return <><rect x="10" y="22" width="44" height="26" rx="6" fill={f} /><path d="M10 28h44" /><path d="M44 28v6" /><circle cx="44" cy="36" r="1.6" /></>;
    case "scarf": return <><path d="M20 10h14v40H20z" fill={f} />{dots("M20 18h14M20 26h14M20 34h14M20 42h14")}<path d="M20 50l-2 6M24 50v6M28 50v6M32 50l2 6" /></>;
    case "neckwarmer": return <><path d="M14 22v20a18 6 0 0 0 36 0V22" fill={f} /><ellipse cx="32" cy="22" rx="18" ry="6" />{dots("M14 32a18 6 0 0 0 36 0")}</>;
    case "headband": return <><ellipse cx="32" cy="34" rx="20" ry="16" fill={f} /><ellipse cx="32" cy="34" rx="14" ry="10" fill="var(--paper, #FBF3EA)" />{dots("M32 21a17 13 0 1 0 0.01 0")}</>;
    case "dishcloth": return <><rect x="14" y="14" width="36" height="36" rx="2" fill={f} />{dots("M14 23h36M14 32h36M14 41h36")}<path d="M44 14c0-4 6-4 6 0" /></>;
    case "bookmark": return <><path d="M26 8h12v40H26z" fill={f} />{dots("M26 16h12M26 24h12M26 32h12M26 40h12")}<path d="M32 48v6l-3 4M32 54l3 4" /></>;
    case "blanket": return <><path d="M10 14h44v32H10z" fill={f} /><path d="M10 46c4 4 40 4 44 0" />{dots("M10 22h44M10 30h44M10 38h44")}</>;
    case "beanie": return <><path d="M14 40c0-14 8-24 18-24s18 10 18 24z" fill={f} /><path d="M12 40h40v8H12z" />{dots("M17 30h30M23 22h18")}<circle cx="32" cy="13" r="3" /></>;
  }
}

export function ItemArt({ id, big, fill }: { id: ItemId; big?: boolean; fill?: string }) {
  const f = fill ? `color-mix(in srgb, ${fill} 40%, transparent)` : "none";
  return (
    <svg viewBox="0 0 64 64" className={big ? "nb-art nb-art-big" : "nb-art"} aria-hidden="true" strokeWidth={big ? 0.45 : 1.4} {...P}>
      {shape(id, f)}
    </svg>
  );
}
