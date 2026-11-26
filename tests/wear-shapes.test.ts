import { describe, expect, it } from "vitest";
import { plan, type PlanInput } from "@/lib/pattern";
import { PROTOS, protoDraft } from "@/lib/prototypes";
import { DEFAULT_DRAFT, type Draft } from "@/lib/types";
import { bustier, moonBag } from "@/lib/wear";
import { toYarnPattern } from "@/src/features/yarn3d/fromPattern";
import { wornForm } from "@/src/features/yarn3d/worn";

// Kim's notes on the 3D: a tray stands as shaped on a square bottom with square walls, the moon bag's hand slot is
// a hole, the bustier comes with either top line, and tops and a balaclava lie on the body as soft cloth.

const yarn = { hook: "5호", weight: "medium", yarnMode: "mm", yarnMm: 3 } as const;
const starter = (id: string, more: Partial<Draft> = {}): PlanInput => ({ ...protoDraft({ ...DEFAULT_DRAFT, ...yarn }, PROTOS.find(p => p.id === id)!), ...more } as PlanInput);
const yp = (p: PlanInput) => toYarnPattern(p as never, plan(p))!;

describe("트레이: 매직링 네모 바닥, 탄성 없이", () => {
  it("is firm, its bottom grown from a ring to the straight part its last round reaches", () => {
    const p = starter("tray"), y = yp(p), pp = plan(p);
    expect(y.firm).toBe(true);
    expect(y.shape.kind).toBe("rect");
    if (y.shape.kind !== "rect") return;
    expect(y.shape.fromRing).toBe(true);
    expect(y.shape.chain).toBe(Math.round((p.a - (p.b as number)) / pp.g.w) + 1);
  });
  it("a chain-started box bottom is drawn as before", () => {
    const y = yp(starter("tote"));
    if (y.shape.kind === "rect") expect(y.shape.fromRing).toBeFalsy();
  });
});

describe("반달 미니백: 손잡이 구멍이 뚫려 있다", () => {
  it("leaves a gap between the round under the slot and its chains", () => {
    const p = starter("moonbag"), pp = plan(p), g = pp.g, M = moonBag(p, g), f = wornForm(p, pp)!;
    // the front disc: its rounds 1..R after a ghost; the slot's middle is at the top of each round
    const top = (r: number) => { const c = f.courses[r]; let best = -1e9; for (let i = 1; i < c.p.length; i += 3) best = Math.max(best, c.p[i]); return best; };
    const gap = top(M.rh) - top(M.rh - 1);
    expect(M.hs).toBeGreaterThan(0);
    expect(gap).toBeGreaterThan(2 * g.h);
  });
});

describe("뷔스티에 윗선 (Kim: 둘 다)", () => {
  it("heart: two cups; straight: none, the straps from the band", () => {
    const heart = plan(starter("bustier")), straight = plan(starter("bustier", { topLine: "straight" }));
    const g = heart.g, B = bustier(starter("bustier"), g);
    expect(heart.rows.filter(r => r.part === "flap").length).toBe(2 * B.CR);
    expect(straight.rows.filter(r => r.part === "flap").length).toBe(0);
    expect(straight.rows.some(r => /띠 윗변 앞/.test(r.how))).toBe(true);
  });
  it("is laid on a body with a bust and shoulders", () => {
    for (const id of ["bustier", "halter", "knittop"]) {
      const p = starter(id), f = wornForm(p, plan(p))!;
      expect(f.stand?.kind).toBe("torso");
      expect(f.stand?.bumps?.length).toBe(4);
    }
  });
});

describe("바라클라바: 머리를 따라 흐물거리게", () => {
  it("its crown and brow follow the head - no round wider than the head there by more than its folds", () => {
    const p = starter("balaclava"), pp = plan(p), f = wornForm(p, pp)!;
    const head = f.stand!.prof, rMax = Math.max(...head.map(q => q[0]));
    for (const c of f.courses) {
      if (c.ghost || c.cen[2] === -40) continue;
      for (let i = 0; i < c.p.length; i += 3) expect(Math.hypot(c.p[i], c.p[i + 2])).toBeLessThan(rMax + 1.6);
    }
  });
});

describe("몸에 입힌 니트 (Kim: 실제 니트처럼, 시안 A · 둥근 목선)", () => {
  it("every course of the knit top and the folded knit bag is knitted - rib at the hem, the cuffs and the neckband", () => {
    for (const id of ["knittop", "knitfold"]) {
      const p = starter(id), f = wornForm(p, plan(p))!, real = f.courses.filter(c => !c.ghost && c.p.length >= 6 && c.on >= 0);
      expect(real.every(c => c.kn === "st" || c.kn === "rib")).toBe(true);
      if (id === "knittop") expect(real.filter(c => c.kn === "rib").length).toBeGreaterThan(6);
    }
  });
  it("the knit top's hem hangs above the table and every point is a number", () => {
    const p = starter("knittop"), f = wornForm(p, plan(p))!;
    for (const c of f.courses) for (let i = 0; i < c.p.length; i += 3) { expect(Number.isFinite(c.p[i] + c.p[i + 1] + c.p[i + 2])).toBe(true); if (!c.ghost) expect(c.p[i + 1]).toBeGreaterThan(0); }
  });
});
