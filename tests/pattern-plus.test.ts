import { describe, expect, it } from "vitest";
import { countToks, rowToks, withKorean } from "@/lib/koreanNotation";
import { shownPlan } from "@/lib/knit";
import { knitFold, knitTop, TOP } from "@/lib/knitwear";
import { gauge, plan, type PlanInput, type Row } from "@/lib/pattern";
import { MARKER_WHY, needleAdvice, patternGauge, phrased, REPEAT_NOTE, repeatRuns } from "@/lib/phrasing";
import { PROTOS, protoDraft } from "@/lib/prototypes";
import { multiSized, SIZES } from "@/lib/sizes";
import { readKorean } from "@/lib/stitchGrammar";
import { pickUp, pickWhy } from "@/lib/structure";
import { DEFAULT_DRAFT, type Draft } from "@/lib/types";
import { HOOK_CHIPS } from "@/lib/yarn";
import { toYarnPattern } from "@/src/features/yarn3d/fromPattern";

// 실제 도안들에서 배운 원리로 (Kim): 도안 글 (S (M) L, 반복 문구, 게이지, 마커), 공식 (코 줍기 비율, 매직링 네모 바닥,
// 꺾임선, 볼록 테두리), 와이어 코어, 기본형 4종. Every number is the formula's; the words are checked against it.

const yarn = { hook: "5호", weight: "medium", yarnMode: "mm", yarnMm: 3 } as const;
const base = { hook: "5호", weight: "medium" } as const;
const starter = (id: string): Draft => protoDraft({ ...DEFAULT_DRAFT, ...yarn }, PROTOS.find(p => p.id === id)!);
const asInput = (d: Draft) => ({ ...d, object: d.object ?? "bag" } as PlanInput);
const NUM = /\d+(?:\.\d+)?/g;
/** every written row read back in the Korean notation adds up to the row's count */
function readsBack(p: PlanInput) {
  const raw = plan(p), ko = withKorean(raw, p);
  ko.rows.forEach((r, i) => {
    const src = raw.rows[i]; if (!src.n || src.part === "join" || src.part === "finish") return;
    const line = /^\d+단$/.test(r.label) ? `${r.label} ${r.how}` : r.how, read = readKorean(line), where = `${src.label}: ${r.how}`;
    expect(read, where).not.toBeNull(); expect(read!.ok, where).toBe(true);
    expect(countToks(rowToks(raw, p, i).toks).st || countToks(rowToks(raw, p, i).toks).base, where).toBeGreaterThan(0);
  });
  return raw;
}

describe("도안 글", () => {
  it("S (M) L: each number is that size's own, from its own plan", () => {
    for (const id of ["knittop", "buckethat", "bustier", "halter", "bonnet"]) {
      const d = starter(id), s = SIZES[d.item!]!, sizes = s.v.map(v => shownPlan(asInput({ ...d, [s.key]: v } as Draft)));
      for (const c of [0, 1, 2] as const) {
        const m = multiSized(asInput({ ...d, [s.key]: s.v[c] } as Draft), q => shownPlan(q))!;
        expect(m.chosen, id).toBe(c);
        let tripled = 0;
        m.plan.rows.forEach((r, i) => {
          const mine = sizes[c].rows[i];
          expect(r.part, id).toBe(mine.part); expect(r.n, id).toBe(mine.n);
          const trip = [...r.how.matchAll(/(\d+(?:\.\d+)?) \((\d+(?:\.\d+)?)\) (\d+(?:\.\d+)?)/g)];
          if (!trip.length) { if (r.how !== mine.how) expect(r.how.replace(NUM, "#"), id).toBe(mine.how.replace(NUM, "#")); return; }
          tripled++;
          // the row's numbers, size by size, are each size's row at that place (the same part, its n-th row)
          const place = sizes.map(pl => pl.rows.filter(x => x.part === r.part)[sizes[c].rows.slice(0, i).filter(x => x.part === r.part).length]);
          const back = (k: number) => r.how.replace(/(\d+(?:\.\d+)?) \((\d+(?:\.\d+)?)\) (\d+(?:\.\d+)?)/g, (_m, a, b, cc) => [a, b, cc][k]);
          for (const k of [0, 1, 2]) expect(back(k), `${id} ${r.label}`).toBe(place[k].how);
          if (r.nSizes) expect(r.nSizes, id).toEqual(place.map(x => x.n));
        });
        expect(tripled, id).toBeGreaterThan(0);
      }
      // a size of its own: no S (M) L
      expect(multiSized(asInput({ ...d, [s.key]: s.v[0] + .5 } as Draft), q => shownPlan(q)), id).toBeNull();
    }
  });

  it("반복 문구: 총 n번 = 1 + n번 더, said once with its meaning", () => {
    for (const p of [{ ...base, object: "bag", shape: "circle", a: 15, h: 18, handle: "none" }, { ...base, object: "rows", shape: "rect", a: 20, b: 20 }, asInput(starter("knittop"))] as PlanInput[]) {
      const pp = shownPlan(p), runs = repeatRuns(plan(p).rows.length === pp.rows.length ? pp.rows.map(r => ({ ...r, why: "" })) : pp.rows);
      expect(runs.length).toBeGreaterThan(0);
      let noted = 0;
      for (const [i, k] of runs) {
        expect(pp.rows[i].why).toContain(`이 단을 총 ${k}번 반복합니다`);
        expect(pp.rows[i + 1].why).toContain(`위와 같은 단을 ${k - 1}번 더 반복합니다`);
        for (let j = i; j < i + k; j++) expect(pp.rows[j].how).toBe(pp.rows[i].how);
        if (i + k < pp.rows.length) expect(pp.rows[i + k].how === pp.rows[i].how && pp.rows[i + k].n === pp.rows[i].n && !pp.rows[i + k].inc).toBe(false);
        if (pp.rows[i].why.includes(REPEAT_NOTE)) noted++;
      }
      expect(noted).toBe(1);
      expect(pp.rows.map(r => [r.n, r.how])).toEqual(phrased(pp).rows.map(r => [r.n, r.how]));
    }
  });

  it("마커를 거는 단은 그 이유를 말합니다; 게이지와 바늘", () => {
    for (const id of ["tray", "panelbag", "knitfold", "knittop"]) {
      const pp = shownPlan(asInput(starter(id)));
      for (const r of pp.rows) if (/마커|단수링/.test(r.how)) expect(/확인|않게|위해|려는|표시/.test(r.why) || r.why.includes(MARKER_WHY), `${id} ${r.label}`).toBe(true);
    }
    const p = { ...base, object: "bag", shape: "circle", a: 15, h: 12 } as PlanInput, { st10 } = patternGauge(p), at = HOOK_CHIPS.findIndex(([k]) => k === "5호");
    expect(st10).toBeCloseTo(10 / gauge(p).w, 0);
    expect(needleAdvice(p, st10).to).toBeNull();
    expect(needleAdvice(p, st10 + 2).to).toBe(HOOK_CHIPS[at + 1][0]);   // more stitches: a size bigger
    expect(needleAdvice(p, st10 - 2).to).toBe(HOOK_CHIPS[at - 1][0]);   // fewer: a size smaller
    expect(needleAdvice(p, st10 + 2).text).toContain("한 치수 굵은");
  });
});

describe("공식", () => {
  it("단에서 코 줍기: the smallest n단에 m코 nearest the rate, the total as worked out", () => {
    for (let rows = 2; rows <= 120; rows += 7) for (const rate of [.6, .8, .95, 1, 1.05, 1.3, 1.6]) {
      const total = Math.max(2, Math.round(rows * rate)), k = pickUp(rows, total);
      expect(k.n).toBeGreaterThanOrEqual(1); expect(k.n).toBeLessThanOrEqual(6);
      for (let n = 1; n <= 6; n++) expect(Math.abs(k.m / k.n - total / rows)).toBeLessThanOrEqual(Math.abs(Math.max(1, Math.round(total / rows * n)) / n - total / rows) + 1e-9);
      expect(pickWhy(rows, total)).toContain(`${rows}단에서 ${total}코 (약 ${k.n}단에 ${k.m}코씩`);
      expect(pickWhy(rows, total)).toContain("손땀에 따라 한 코씩 조절해도 됩니다");
    }
  });

  it("매직링 네모 바닥: from 8, the corners and the long sides, to the chain's own last round", () => {
    for (const [a, b] of [[24, 16], [20, 20], [32, 10], [14, 12]]) {
      const p = { ...base, object: "bag", shape: "rect", a, b, h: 6, handle: "none" } as PlanInput, ring = readsBack({ ...p, bottomStart: "ring" }), chain = plan(p);
      const rb = ring.rows.filter(r => r.part === "bottom"), cb = chain.rows.filter(r => r.part === "bottom");
      expect(rb[0].n).toBe(8); expect(rb[0].how).toContain("매직링에");
      expect(rb[rb.length - 1].n).toBe(cb[cb.length - 1].n);                 // the same bottom
      rb.slice(1).forEach((r, i) => { const prev = rb[i].n; expect(r.inc).toBe(r.n - prev); expect(r.inc).toBeLessThanOrEqual(prev); if (i < rb.length - 2) expect(r.inc).toBeGreaterThanOrEqual(8); });
      expect(ring.rows.filter(r => r.part === "body").map(r => r.n)).toEqual(chain.rows.filter(r => r.part === "body").map(r => r.n));
    }
  });

  it("꺾임선 and 볼록 테두리: words and rounds, the side's count kept; the 3D takes them", () => {
    const p = { ...base, object: "bag", shape: "circle", a: 15, h: 10, handle: "none" } as PlanInput, plain = plan(p);
    const back = readsBack({ ...p, crease: "back" }), front = plan({ ...p, crease: "front" });
    const b1 = back.rows.find(r => r.part === "body")!;
    expect(b1.how.startsWith("뒤이랑(뒷고리에만)으로")).toBe(true); expect(b1.crease).toBe("back");
    expect(front.rows.find(r => r.part === "body")!.how.startsWith("앞이랑(앞고리에만)으로")).toBe(true);
    expect(back.rows.map(r => r.n)).toEqual(plain.rows.map(r => r.n));
    expect(toYarnPattern(p as never, back)!.crease).toBeUndefined();          // (from the plan input, not the rows)
    expect(toYarnPattern({ ...p, crease: "back" } as never, back)!.crease).toBe("back");
    const bulged = readsBack({ ...p, bulge: .5 }), body = bulged.rows.filter(r => r.part === "body"), N = plain.rows.filter(r => r.part === "body").pop()!.n, roll = body.filter(r => r.bulge);
    expect(roll.map(r => r.n - N)).toEqual([roll[0].n - N, roll[0].n - N, 0]);
    expect(roll[0].n).toBeGreaterThan(N);
    expect(roll.map(r => r.inc)).toEqual([roll[0].n - N, 0, N - roll[0].n]);
    expect(bulged.rows.filter(r => r.part === "rim").map(r => r.n)).toEqual(plain.rows.filter(r => r.part === "rim").map(r => r.n));
    const nb = bulged.rows.filter(r => r.part === "bottom").length; body.forEach((r, i) => expect(r.label).toBe(`${nb + i + 1}단`));
    const yp = toYarnPattern({ ...p, bulge: .5 } as never, bulged)!;
    if (yp.shape.kind === "round") expect(Math.max(...yp.shape.counts)).toBe(roll[0].n);
  });

  it("와이어 코어: a last step, no slump in the 3D", () => {
    const p = { ...base, object: "bag", shape: "circle", a: 15, h: 10, handle: "none", materials: ["와이어 코어"], drape: true } as PlanInput & { drape: boolean }, pp = plan(p), last = pp.rows[pp.rows.length - 1];
    expect([last.part, last.how]).toEqual(["finish", "다 뜬 뒤 손으로 모양을 잡아 줍니다"]);
    expect(last.why).toContain("빼뜨기는 느슨하게");
    const yp = toYarnPattern(p as never, pp)!; expect(yp.gravity).toBeUndefined(); expect(yp.softK).toBe(.3); expect(yp.material).toBe("cord");
  });
});

describe("기본형 4종", () => {
  it("접어 만드는 대바늘 가방: a long panel, a strap from the stitches kept, its opening edged in crochet", () => {
    const d = starter("knitfold"), p = asInput(d), g = gauge(p), B = knitFold(p, g), pp = plan(p);
    expect(B.W).toBe(Math.round(30 / g.w)); expect(B.L % 2).toBe(0); expect(Math.abs(B.L - 52 / g.h)).toBeLessThanOrEqual(1.5); // (made even so the fold is its middle)
    expect(B.K).toBe(Math.round(4 / g.w)); expect(B.SR).toBe(Math.round(60 / g.h));
    const panel = pp.rows.filter(r => r.part === "panel"), strap = pp.rows.filter(r => r.part === "strap"), rim = pp.rows.filter(r => r.part === "rim");
    expect(panel[0].how).toBe(`별사슬로 ${B.W}코 잡기`); expect(panel.filter(r => /^판 \d+단$/.test(r.label)).length).toBe(B.L);
    expect(strap.length).toBe(B.SR); expect(strap.every(r => r.n === B.K)).toBe(true);
    expect(rim.map(r => r.n)).toEqual([B.top, B.outer]); expect(B.top).toBe(2 * (B.W - B.K) + B.outer);
    expect(rim[0].how).toContain("코바늘로"); expect(rim[0].why).toContain("단에서");
    expect(pp.rows.find(r => r.label === "끈 잇기")!.how).toContain("메리야스 잇기");
    const yp = toYarnPattern(d as never, pp)!; expect(yp.shape.kind).toBe("form");
  });

  it("위에서부터 뜨는 니트 탑: back, front from its shoulders, the body round, the sleeves picked up and narrowed", () => {
    for (const bust of [84, 92, 100]) {
      const d = { ...starter("knittop"), bust }, p = asInput(d), g = gauge(p), K = knitTop(p, g), pp = plan(p), C = bust + TOP.ease;
      expect(K.T).toBe(Math.round(C * TOP.shoulder / g.w)); expect(K.Half - K.T).toBe(2 * K.e); expect(K.N).toBe(2 * K.Half + 2 * K.U);
      const back = pp.rows.filter(r => /^뒤판 \d+단$/.test(r.label)), front = pp.rows.filter(r => /^앞판 \d+단$/.test(r.label));
      expect(back.length).toBe(K.AR); expect(front.length).toBe(K.AR);
      expect(back[back.length - 1].n).toBe(K.Half); expect(front[front.length - 1].n).toBe(K.Half);
      back.forEach((r, i) => { if (i) expect(r.n - back[i - 1].n).toBe(2 * r.edge![0]); });
      expect(front[0].how).toContain(`어깨 ${K.S}코씩 주워`); expect(front[K.ND].how).toContain(`목 코 ${K.c0}코 만들기`); expect(front[K.ND].n).toBe(back[K.ND].n);
      // 둥근 목선: the neck's stitches = the curve's gains + the middle cast on; each shoulder gains at its neck edge in the last rows
      expect(2 * K.m + K.c0).toBe(K.neck); expect(front[K.ND - 1].n).toBe(2 * (K.S + K.gained(K.ND) + K.m));
      const nb = pp.rows.filter(r => /^목둘레/.test(r.label)); expect(nb.length).toBe(K.NBr + 1); expect(K.NB % 2).toBe(0);
      const body = pp.rows.filter(r => r.part === "body"); expect(body[0].n).toBe(K.N); expect(body.length).toBe(K.BR);
      const sl = pp.rows.filter(r => r.part === "strap"); expect(sl[0].n).toBe(K.P); expect(K.P).toBe(K.pick + K.U);
      expect(sl.filter(r => r.inc === -2).length).toBe(K.d); expect(sl[sl.length - 1].n).toBe(K.P - 2 * K.d);
      if (K.d) expect(sl[1].why).toContain(`${K.every}단마다 마커 양쪽에서 1코씩 줄이기를 총 ${K.d}번 반복합니다`);
      expect(sl[0].why).toContain("단에서");
      const yp = toYarnPattern(d as never, pp)!; expect(yp.shape.kind).toBe("form"); expect(yp.stand?.kind).toBe("torso");
    }
  });

  it("트레이 and 두 색 손잡이 그물 가방", () => {
    const t = starter("tray"), tp = plan(asInput(t));
    expect([t.bottomStart, t.crease, t.bulge]).toEqual(["ring", "back", .4]);
    expect(tp.rows[0].how).toContain("매직링에"); expect(tp.rows.some(r => r.crease)).toBe(true); expect(tp.rows.filter(r => r.bulge).length).toBe(3);
    expect(t.extras?.items?.[0].at).toEqual([0, .55, 3]);
    const n = starter("netduo"), np = plan(asInput(n)), first = np.rows.findIndex(r => r.part === "bottom");
    expect(n.handleFirst).toBe(true); expect(n.handleColor).toBeTruthy();
    expect(np.rows.slice(0, first).every(r => r.part === "handle")).toBe(true); expect(first).toBeGreaterThan(0);
    expect(np.rows.slice(0, first).filter(r => !r.border).every(r => r.how.includes("입구 테두리에서 함께 걸어 고정합니다"))).toBe(true);
    expect(np.rows.find(r => r.part === "rim" && !r.border)!.how).toContain("함께 걸어 뜹니다");
    expect(np.rows.some(r => r.wall?.k === "net")).toBe(true);
    np.rows.forEach((r, i) => expect(r.idx).toBe(i));
    expect(toYarnPattern(n as never, np)!.strapColor).toBe(n.handleColor);
  });
});
