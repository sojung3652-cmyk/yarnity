import { describe, expect, it } from "vitest";
import { foldRows, paintCells, rowChanges, rowNo, rowSig } from "@/lib/drawMap";
import { COLOR_SWAP, plan, type PaintShape, type PlanInput } from "@/lib/pattern";
import { stepCards } from "@/lib/stepCards";
import { toYarnPattern } from "@/src/features/yarn3d/fromPattern";

// 기호도안 표기 · 두 색 그림 넣기 · 단계 카드 (Kim: 실제 도안들의 표기 원리). What the canvas draws is decided by
// these pure pieces: which rows fold behind the wavy line, which rows carry "(총 ○코)", the painted picture's
// cells (the 3D's very cells), and the cards a plan is told in.

const base = { hook: "5호", weight: "medium" } as const;
const same = (a: { n: number }, b: { n: number }) => a.n === b.n;

describe("같은 단 반복은 물결선으로 접는다", () => {
  it("a run of four or more keeps its first and last row, the rest is one fold", () => {
    const rows = [6, 12, 18, 24, 24, 24, 24, 24, 24, 30].map(n => ({ n }));
    expect(foldRows(rows, same)).toEqual([{ row: { n: 6 }, i: 0 }, { row: { n: 12 }, i: 1 }, { row: { n: 18 }, i: 2 }, { row: { n: 24 }, i: 3 }, { fold: [4, 7] }, { row: { n: 24 }, i: 8 }, { row: { n: 30 }, i: 9 }]);
    // three alike are not worth a fold; a fold never hides a single row
    expect(foldRows([5, 5, 5].map(n => ({ n })), same).every(d => "row" in d)).toBe(true);
    expect(foldRows([5, 5, 5, 5].map(n => ({ n })), same)).toEqual([{ row: { n: 5 }, i: 0 }, { fold: [1, 2] }, { row: { n: 5 }, i: 3 }]);
  });

  it("the row being made stays in sight inside a fold", () => {
    const rows = Array.from({ length: 30 }, () => ({ n: 40 }));
    for (const keep of [0, 1, 2, 14, 27, 28, 29]) {
      const d = foldRows(rows, same, keep), shown = d.flatMap(x => ("row" in x ? [x.i] : [])), hidden = d.flatMap(x => ("fold" in x ? Array.from({ length: x.fold[1] - x.fold[0] + 1 }, (_, k) => x.fold[0] + k) : []));
      expect(shown).toContain(keep);
      expect(shown).toContain(0); expect(shown).toContain(29);
      expect([...shown, ...hidden].sort((a, b) => a - b)).toEqual(rows.map((_, i) => i)); // every row once: shown or folded
      d.forEach(x => { if ("fold" in x) expect(x.fold[1]).toBeGreaterThan(x.fold[0]); });
    }
  });

  it("a bag's body folds, its bottom does not; only the rows whose count changes carry the count", () => {
    const pp = plan({ ...base, object: "bag", shape: "circle", a: 15, h: 18, handle: "none" } as PlanInput);
    const bottom = pp.rows.filter(r => r.part === "bottom"), body = pp.rows.filter(r => r.part === "body" || r.part === "rim");
    expect(foldRows(bottom, (a, b) => rowSig(a) === rowSig(b)).every(d => "row" in d)).toBe(true);
    const folded = foldRows(body, (a, b) => rowSig(a) === rowSig(b)), folds = folded.filter(d => "fold" in d);
    expect(folds.length).toBe(1);
    expect(bottom.slice(1).every(rowChanges)).toBe(true);
    expect(body.filter(r => r.part === "body").slice(1).some(rowChanges)).toBe(false);
    expect(rowNo(body[1])).toBe(String(bottom.length + 2));
    // a strip is one row again and again: all of it but its ends folds
    const strip = plan({ ...base, object: "bag", shape: "rect", build: "panels", a: 24, h: 20, stripCm: 6, handle: "none" } as PlanInput).rows.filter(r => r.part === "strip" && !/시작 사슬$/.test(r.label));
    const fs = foldRows(strip.slice(1), (a, b) => rowSig(a) === rowSig(b));
    expect(fs.length).toBe(3);
    expect(rowNo(strip[4])).toBe("5");
  });
});

describe("두 색 그림 넣기", () => {
  const paint: PaintShape = { gw: 6, gh: 5, cells: ["000000", "011110", "010010", "011110", "000000"].join(""), palette: ["#EFE6D4", "#B8743C"], wCm: 12, hCm: 10 };
  const p = { ...base, object: "rows", shape: "rect", a: 12, b: 10, paint } as PlanInput;

  it("the chart's cells are the 3D's cells, a cell a stitch, each in its colour", () => {
    const pp = plan(p), c = paintCells(paint, pp.g), yp = toYarnPattern(p as never, pp)!;
    expect(yp.shape.kind).toBe("grid");
    if (yp.shape.kind === "grid") { expect(yp.shape.cells).toEqual(c.cells); expect([yp.shape.W, yp.shape.H]).toEqual([c.W, c.H]); }
    expect(yp.colors).toEqual(paint.palette);
    // a row of the chart holds the stitches the row's words count, colour by colour
    const rows = pp.rows.filter(r => r.part === "rows");
    expect(rows.length).toBe(c.H);
    rows.forEach((r, i) => {
      const cells = c.cells.slice(i * c.W, (i + 1) * c.W);
      expect(cells.filter(x => x >= 0).length).toBe(r.n);
      for (const [k, name] of [[0, "색 1로"], [1, "색 2로"]] as const) {
        const said = [...r.how.matchAll(new RegExp(`${name} 짧은뜨기 (\\d+)`, "g"))].reduce((s, m) => s + Number(m[1]), 0);
        expect(said).toBe(cells.filter(x => x === k).length);
      }
    });
  });

  it("a row that changes colour says how, a row in one colour does not", () => {
    const rows = plan(p).rows.filter(r => r.part === "rows");
    expect(COLOR_SWAP).toBe("색이 바뀌는 코 앞: 앞 코의 마지막 고리를 빼기 직전에 다음 색으로 바꿉니다. 쓰지 않는 색은 안에 감싸서 함께 가져갑니다.");
    rows.forEach(r => expect(r.why.includes(COLOR_SWAP)).toBe(/색 1로/.test(r.how) && /색 2로/.test(r.how)));
    expect(rows.some(r => r.why.includes(COLOR_SWAP))).toBe(true);
    // one colour: nothing to change
    expect(plan({ ...p, paint: { ...paint, palette: ["#B8743C"], cells: paint.cells.replace(/1/g, "0") } }).rows.some(r => r.why.includes("색 바꿈"))).toBe(false);
  });
});

describe("단계 카드", () => {
  it("a card for each part as it is worked, numbered, the last the finished piece", () => {
    const pp = plan({ ...base, object: "bag", shape: "oval", a: 24, b: 8, h: 18, handle: "short", handleCount: 2 } as PlanInput), cards = stepCards(pp);
    expect(cards.map(c => c.part)).toEqual(["bottom", "body", "rim", "handle", "end"]);
    expect(cards.map(c => c.no)).toEqual(["01", "02", "03", "04", "05"]);
    expect(cards.map(c => c.title)).toEqual(["바닥", "몸통", "테두리", "손잡이", "마무리"]);
    // the cards cover every row once, in order
    expect(cards.slice(0, -1).flatMap(c => Array.from({ length: c.to - c.from + 1 }, (_, k) => c.from + k))).toEqual(pp.rows.map((_, i) => i));
    // the numbers on a card are the plan's
    const bottom = pp.rows.filter(r => r.part === "bottom"), body = pp.rows.filter(r => r.part === "body");
    expect(cards[0].lines[0]).toBe(`${bottom.length}단 동안 늘려 한 바퀴가 ${bottom[bottom.length - 1].n}코가 됩니다.`);
    expect(cards[1].lines[0]).toBe(`늘림 없이 ${body.length}단을 올립니다.`);
    cards.forEach(c => { expect(c.lines.length).toBe(2); c.lines.forEach(l => expect(l.length).toBeGreaterThan(4)); });
    // counted steps show their chart, the shape steps the 3D
    expect(cards.map(c => c.pic)).toEqual(["chart", "chart", "chart", "3d", "3d"]);
  });

  it("joining and the last step are 3D; never more than two 3D pictures; a brushed piece ends on its own step", () => {
    const panels = plan({ ...base, object: "bag", shape: "rect", build: "panels", a: 24, h: 20, stripCm: 6, stripHandle: false, handle: "short", brush: .5 } as PlanInput), cards = stepCards(panels);
    expect(cards.map(c => c.part)).toEqual(["panel", "strip", "join", "handle", "finish"]);
    expect(cards.filter(c => c.pic === "3d").length).toBe(2);
    expect(cards.map(c => c.pic)).toEqual(["chart", "chart", "none", "3d", "3d"]);
    expect(cards[4].lines[0]).toBe("다 뜬 뒤 브러시로 표면을 빗어 털 질감을 냅니다.");
    expect(cards[2].lines).toEqual([`되돌아짧은뜨기 ${panels.rows.find(r => r.part === "join" && r.n)!.n}코로 잇습니다.`, "잇기 전에 마커링으로 자리를 먼저 맞춥니다."]);
    const flat = stepCards(plan({ ...base, object: "rows", shape: "rect", a: 20, b: 20 } as PlanInput), "코잡기");
    expect(flat.map(c => [c.title, c.pic])).toEqual([["코잡기", "chart"], ["왕복뜨기", "chart"], ["마무리", "3d"]]);
  });
});
