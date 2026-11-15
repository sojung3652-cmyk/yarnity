// VERBATIM copy of the engine from legacy/index.html (lines 438-546). Do not edit:
// it is the reference the TypeScript port in lib/pattern.ts is tested against.
  const HOOKS = [["2호", 2.0], ["3호", 2.3], ["4호", 2.5], ["5호", 3.0], ["6호", 3.5], ["7호", 4.0], ["8호", 5.0], ["10호", 6.0]];
  const HOOK_MM = Object.fromEntries(HOOKS);
  const YARN = { thin: 0.9, medium: 1.0, thick: 1.15 };
  const YARN_KO = { thin: "가는 실", medium: "보통", thick: "굵은 실" };
  const SHAPE_KO = { circle: "원형", oval: "타원", rect: "사각" };
  const rnd = (x) => Math.round(+x.toFixed(6));
  const fmt = (n, d = 1) => (Math.round(n * 10 ** d) / 10 ** d).toString();

  function gauge(p) {
    if (p.measuredH) return { h: p.measuredH, w: p.measuredH * 0.95, measured: true };
    const h = (HOOK_MM[p.hook] || 3) * 0.2 * (YARN[p.weight] || 1);
    return { h, w: h * 0.95, measured: false };
  }
  function planBottom(p, g) {
    const rows = [];
    if (p.shape === "circle") {
      const R = Math.max(3, rnd((p.a / 2) / g.h));
      for (let r = 1; r <= R; r++) {
        const n = 6 * r, prev = 6 * (r - 1);
        let how;
        if (r === 1) how = "매직링에 짧은뜨기 6코";
        else if (r === 2) how = "모든 코에 늘림";
        else if (r % 2 === 0 || r < 4) how = `(짧은뜨기 ${r - 2}, 늘림 1) × 6`;
        else { const k = Math.floor((r - 2) / 2); how = `짧은뜨기 ${k}, (늘림 1, 짧은뜨기 ${r - 2}) × 5, 늘림 1, 짧은뜨기 ${r - 2 - k}`; }
        rows.push({ part: "bottom", n, how, why: r === 1 ? "시작" : `${prev} + 늘림 6 = ${n}${r >= 4 && r % 2 ? " · 늘림 자리를 반 칸 밀어 둥글게" : ""}`, inc: r === 1 ? 0 : 6 });
      }
      return { rows, c: 0 };
    }
    const straight = Math.max(g.w * 2, p.a - p.b);
    const c = Math.max(3, rnd(straight / g.w) + 1);
    const R = Math.max(3, rnd((p.b / 2) / g.h));
    const per = p.shape === "oval" ? 6 : 8;
    for (let r = 1; r <= R; r++) {
      const n = 2 * (c - 1) + 6 + per * (r - 1);
      const prev = r === 1 ? 0 : n - per;
      let how;
      if (r === 1) how = `사슬 ${c}코, 둘째 코부터 짧은뜨기 ${c - 2}코 · 끝 코에 3코 · 반대편 짧은뜨기 ${c - 2}코 · 끝 코에 3코`;
      else if (p.shape === "oval") how = "직선은 그대로, 양 끝 반원에서 3번씩 늘림";
      else how = "직선은 그대로, 네 모서리 코마다 3코 뜨기";
      rows.push({ part: "bottom", n, how, why: r === 1 ? `사슬 ${c}코 기초 → ${n}코` : `${prev} + 늘림 ${per} = ${n}`, inc: r === 1 ? 0 : per });
    }
    return { rows, c };
  }
  function plan(p) {
    const g = gauge(p);
    const { rows: bottom, c } = planBottom(p, g);
    const last = bottom[bottom.length - 1].n;
    const rows = bottom.slice();
    if (p.object === "bag") {
      const bodyRows = Math.max(2, rnd(p.h / g.h));
      for (let i = 0; i < bodyRows; i++) rows.push({ part: "body", n: last, how: `늘림 없이 짧은뜨기 ${last}코`, why: i === 0 ? "여기서부터 위로 올라가요" : `${last}코 그대로`, inc: 0 });
      for (let i = 0; i < 2; i++) rows.push({ part: "rim", n: last, how: i === 0 ? `짧은뜨기 ${last}코` : `빼뜨기 ${last}코로 마무리`, why: "입구를 단단하게", inc: 0 });
      if (p.handle !== "none") {
        const len = p.handle === "long" ? 90 : 25, ch = rnd(len / (g.w * 0.85));
        for (let i = 0; i < 2; i++) rows.push({ part: "handle", n: ch, how: `사슬 ${ch}코 (약 ${len}cm), 짧은뜨기로 되돌아 뜨고 양쪽에 연결`, why: `${len}cm ÷ 사슬 한 코 ${fmt(g.w * 0.85 * 10)}mm`, inc: 0 });
      }
    }
    let bi = 0, bo = 0, ri = 0, ha = 0;
    rows.forEach((r, i) => {
      r.idx = i;
      if (r.part === "bottom") { r.no = ++bi; r.label = `${bi}단`; }
      else if (r.part === "body") r.label = `${bottom.length + (++bo)}단`;
      else if (r.part === "rim") r.label = `테두리 ${++ri}`;
      else r.label = `손잡이 ${++ha}`;
    });
    return { g, c, rows, bottomRounds: bottom.length, bodyRows: rows.filter(r => r.part === "body").length, last };
  }
  function outline(shape, r, g, c) {
    const rad = r * g.h;
    if (shape === "circle") return { at: (t) => { const a = -Math.PI / 2 + t * 2 * Math.PI; return [rad * Math.cos(a), rad * Math.sin(a)]; } };
    const a = (c - 1) * g.w;
    if (shape === "oval") {
      const per = 2 * a + 2 * Math.PI * rad;
      return { at: (t) => {
        let s = t * per;
        if (s < a) return [-a / 2 + s, -rad]; s -= a;
        if (s < Math.PI * rad) { const ang = -Math.PI / 2 + s / rad; return [a / 2 + rad * Math.cos(ang), rad * Math.sin(ang)]; } s -= Math.PI * rad;
        if (s < a) return [a / 2 - s, rad]; s -= a;
        const ang = Math.PI / 2 + s / rad; return [-a / 2 + rad * Math.cos(ang), rad * Math.sin(ang)];
      } };
    }
    const hx = a / 2 + rad, hy = rad, per = 4 * hx + 4 * hy;
    return { at: (t) => {
      let s = t * per;
      if (s < 2 * hx) return [-hx + s, -hy]; s -= 2 * hx;
      if (s < 2 * hy) return [hx, -hy + s]; s -= 2 * hy;
      if (s < 2 * hx) return [hx - s, hy]; s -= 2 * hx;
      return [-hx, hy - s];
    } };
  }
  function dots(pp, shape, rounds) {
    const out = [];
    for (let r = 1; r <= rounds; r++) {
      const n = pp.rows[r - 1].n, inc = pp.rows[r - 1].inc, o = outline(shape, r, pp.g, pp.c), pts = [];
      const off = shape === "circle" && r % 2 ? 0.5 / n : 0;
      for (let i = 0; i < n; i++) { const [x, y] = o.at(((i + 0.5) / n + off) % 1); pts.push({ x, y, inc: false }); }
      if (inc) {
        if (shape === "circle") pts.forEach((pt, i) => { pt.inc = r === 2 || (r >= 3 && i % (r - 1) === r - 2); });
        else {
          const targets = [], a = (pp.c - 1) * pp.g.w, rad = r * pp.g.h;
          if (shape === "oval") for (const sx of [1, -1]) for (let k = 0; k < 3; k++) { const ang = -Math.PI / 2 + (k + 0.5) / 3 * Math.PI; targets.push([sx * (a / 2 + rad * Math.cos(ang)), sx * rad * Math.sin(ang)]); }
          else { const hx = a / 2 + rad; for (const [cx, cy] of [[hx, -rad], [hx, rad], [-hx, rad], [-hx, -rad]]) { targets.push([cx * 0.97, cy * 0.85], [cx * 0.88, cy * 0.98]); } }
          for (const [tx, ty] of targets) { let best = null, bd = 1e9; for (const pt of pts) { if (pt.inc) continue; const d = (pt.x - tx) ** 2 + (pt.y - ty) ** 2; if (d < bd) { bd = d; best = pt; } } if (best) best.inc = true; }
        }
      }
      out.push({ r, pts });
    }
    return out;
  }
module.exports = { HOOKS, YARN, gauge, planBottom, plan, outline, dots };
