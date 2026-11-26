// 대바늘 기본형 (Kim: 실제 도안들에서 배운 원리로 - 숫자와 문장은 우리 공식과 우리 말로):
//   접어 만드는 대바늘 가방   one long rectangle of stockinette from a waste-yarn cast on; at its end all but a few
//                             stitches bound off, those few going on as the strap; the rectangle folded in half and
//                             its sides joined; the strap's end grafted (메리야스 잇기) to the same stitches at the
//                             cast-on end; the opening edged in crochet 짧은뜨기, picked up along the strap's rows
//   위에서부터 뜨는 니트 탑     the back from the shoulders down; the front's shoulders picked up from the back's
//                             cast-on edge, the neck cast on between them; front and back joined under the arms
//                             and worked round to the hem; the sleeves picked up round the armhole and narrowed
//                             at the underarm every few rounds to the cuff
// Only how each is put together is taken from made pieces. Every number is the gauge's (a width over a stitch's
// width, a length over a row's height) and the sizes typed; the body's shares (ease, shoulder, neck, armhole)
// are Yarnity's own and are said in the rows' notes.
import type { Gauge, Plan, PlanInput, Row } from "./pattern";
import { pickUp, pickWhy } from "./structure";

const rnd = (x: number) => Math.round(+x.toFixed(6));
const fmt = (n: number, d = 1) => (Math.round(n * 10 ** d) / 10 ** d).toString();
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const mm = (v: number) => fmt(v * 10);
const pos = (v: number | null | undefined, d: number) => (v != null && v > 0 ? v : d);
const number = (rows: Row[]) => { rows.forEach((r, i) => { r.idx = i; }); return rows; };
/** a row of stockinette worked back and forth: the right side knit, the wrong side purl */
const flatRow = (i: number, n: number) => (i % 2 ? `안면: 모두 안뜨기 ${n}코` : `겉면: 모두 겉뜨기 ${n}코`);
/** stitches along `rows` rows' ends (a row's height over a stitch's width) */
const along = (rows: number, g: Gauge) => Math.max(2, rnd(rows * g.h / g.w));

// ---------------------------------------------------------------- 접어 만드는 대바늘 가방
/** a = the bag's width, h = its height (the rectangle is twice as long: it is folded at the bottom), handleWcm =
 *  the strap's width, strapCm = its length (cm).
 *    W = a / a stitch's width       L = 2 h / a row's height (even: the fold is its middle)
 *    K = the strap's width / a stitch's width (at least 3, at most W - 3)    SR = the strap / a row's height */
export function knitFold(p: Pick<PlanInput, "a" | "h" | "handleWcm" | "strapCm">, g: Gauge) {
  const a = pos(p.a, 30), h = pos(p.h, 26), W = Math.max(10, rnd(a / g.w)); let L = Math.max(8, rnd(2 * h / g.h)); if (L % 2) L++;
  const K = clamp(rnd(pos(p.handleWcm, 4) / g.w), 3, W - 3), strapCm = pos(p.strapCm, 60), SR = Math.max(4, rnd(strapCm / g.h));
  const side = along(L / 2, g), top = 2 * (W - K) + along(SR, g), outer = along(SR, g);
  return { a, h, W, L, K, strapCm, SR, side, top, outer };
}
export function planKnitFold(p: PlanInput, g: Gauge): Plan {
  const B = knitFold(p, g), { W, L, K, SR } = B, rows: Row[] = [];
  rows.push({ part: "panel", n: W, inc: 0, own: true, edge: [0, 0], label: "코잡기", how: `별사슬로 ${W}코 잡기`,
    why: `너비 ${fmt(B.a)}cm ÷ 코 너비 ${mm(g.w)}mm = ${W}코 · 별사슬은 나중에 풀어 끈 끝과 잇습니다` } as Row);
  for (let i = 0; i < L; i++) rows.push({ part: "panel", n: W, inc: 0, own: true, edge: [0, 0], label: `판 ${i + 1}단`, how: flatRow(i, W),
    why: i === 0 ? `높이 ${fmt(B.h)}cm의 두 배 ÷ 코 높이 ${mm(g.h)}mm = ${L}단 · ${L / 2}단째가 바닥(접는 선)입니다` : i === L / 2 - 1 ? "여기까지가 앞판, 다음 단부터 뒤판입니다" : `${W}코 그대로` } as Row);
  rows.push({ part: "panel", n: K, inc: -(W - K), own: true, edge: [0, -(W - K)], label: "코막음", how: `겉면: 겉뜨기로 ${W - K}코를 코막음하고, 남은 ${K}코는 바늘에 둡니다`,
    why: `끈 너비 ${fmt(pos(p.handleWcm, 4))}cm ÷ 코 너비 ${mm(g.w)}mm = ${K}코가 끈이 됩니다` } as Row);
  for (let i = 0; i < SR; i++) rows.push({ part: "strap", n: K, inc: 0, own: true, edge: [0, 0], label: `끈 ${i + 1}단`, how: flatRow(i + 1, K),
    why: i === 0 ? `끈 ${fmt(B.strapCm)}cm ÷ 코 높이 ${mm(g.h)}mm = ${SR}단` : `${K}코 그대로` } as Row);
  rows.push({ part: "join", n: 0, own: true, inc: 0, label: "잇기 준비", how: `판을 ${L / 2}단째에서 겉이 안으로 오게 반 접고, 양 옆선의 위아래 끝을 마커로 맞춥니다`,
    why: "마커는 앞판과 뒤판의 단이 어긋나지 않게 하려는 것입니다" } as Row);
  rows.push({ part: "join", n: 0, own: true, inc: 0, label: "옆선 잇기", how: `양 옆선을 ${L / 2}단씩 떠서 잇기로 잇습니다 (단마다 가로실 하나씩)`, why: "접는 선이 바닥이 됩니다 · 다 이으면 겉으로 뒤집습니다" } as Row);
  rows.push({ part: "join", n: K, own: true, inc: 0, label: "끈 잇기", how: `별사슬을 풀어 시작 쪽의 같은 자리 ${K}코를 바늘에 옮기고, 끈 끝 ${K}코와 메리야스 잇기로 잇습니다`,
    why: "끈이 비틀리지 않게 겉면끼리 같은 쪽을 보게 맞춥니다" } as Row);
  rows.push({ part: "join", n: 0, own: true, inc: 0, label: "남은 코 막기", how: `시작 쪽에 남은 ${W - K}코는 겉뜨기로 코막음합니다`, why: "앞판과 같은 입구가 됩니다" } as Row);
  // the opening in crochet 짧은뜨기 (Kim: 입구 코바늘 짧은뜨기 테두리, 5번 비율)
  rows.push({ part: "rim", n: B.top, inc: 0, own: true, label: "입구 테두리", how: `코바늘로 입구와 끈 안쪽을 따라 사슬 1, 짧은뜨기 ${B.top}코로 한 바퀴 두르고 첫 코에 빼뜨기`,
    why: `앞뒤 코막음 쪽 ${W - K}코씩 + 끈 안쪽 ${pickWhy(SR, along(SR, g))}` } as Row);
  rows.push({ part: "rim", n: B.outer, inc: 0, own: true, label: "끈 바깥 테두리", how: `끈 바깥쪽을 따라 사슬 1, 짧은뜨기 ${B.outer}코로 한 바퀴 두르고 첫 코에 빼뜨기`,
    why: `끈 바깥 ${pickWhy(SR, B.outer)} · 끈이 늘어나지 않고 단단해집니다` } as Row);
  return { g, c: W, rows: number(rows), bottomRounds: 0, bodyRows: L, last: W };
}

// ---------------------------------------------------------------- 위에서부터 뜨는 니트 탑
/** Yarnity's body shares for a knitted top worn with ease (of the round worn, `bust` + EASE) */
export const TOP = { ease: 8, shoulder: .38, neck: .17, neckDrop: .08, armhole: .21, underarm: .03, cuff: .26 };
/** bust = the round worn (cm), h = the length from the shoulder, sleeveCm = the sleeve's length from the underarm.
 *    C = bust + ease    Half = C / 2 / a stitch's width    T (the back's top) = C x shoulder / a stitch's width
 *    neck = C x neck share (the same evenness as T)    S = a shoulder = (T - neck) / 2
 *    AR (armhole rows) = C x armhole share / a row's height     ND (neck rows) = C x drop share / a row's height
 *    each edge gains (Half - T) / 2 over the armhole's rows, spread evenly
 *    U (underarm, each side) = C x underarm share / a stitch's width    N (the body's round) = 2 Half + 2 U
 *    a sleeve: picked up round the armhole (2 AR rows' ends) + U; narrowed at the underarm to the cuff */
export function knitTop(p: Pick<PlanInput, "bust" | "h" | "sleeveCm">, g: Gauge) {
  const bust = pos(p.bust, 92), len = pos(p.h, 52), sleeveCm = pos(p.sleeveCm, 40), C = bust + TOP.ease;
  let T = Math.max(10, rnd(C * TOP.shoulder / g.w)), neck = Math.max(4, rnd(C * TOP.neck / g.w)); if ((T - neck) % 2) neck++;
  let Half = Math.max(T + 2, rnd(C / 2 / g.w)); if ((Half - T) % 2) Half++;
  const S = (T - neck) / 2, AR = Math.max(6, rnd(C * TOP.armhole / g.h)), ND = clamp(rnd(C * TOP.neckDrop / g.h), 2, AR - 2), e = (Half - T) / 2;
  const U = Math.max(2, rnd(C * TOP.underarm / g.w)), N = 2 * Half + 2 * U;
  const BR = Math.max(4, rnd((len - AR * g.h) / g.h)), rib = Math.max(3, rnd(4 / g.h));
  const pick = along(2 * AR, g), P = pick + U, cuff = Math.min(P, Math.max(8, 2 * Math.floor(rnd(C * TOP.cuff / g.w) / 2)));
  const SRs = Math.max(4, rnd(sleeveCm / g.h)), d = Math.floor((P - cuff) / 2), every = d > 0 ? Math.max(1, Math.floor((SRs - rib) / (d + 1))) : 0;
  // the edge's gain by armhole row r (1-based): what it has gained in all, spread evenly over the armhole's rows
  const gained = (r: number) => Math.round(e * r / AR);
  // 둥근 목선 (Kim): the front neck's last `m` rows each gain a stitch at both neck edges, then `c0` are cast on in the
  // middle - steep near the shoulder, flat at the bottom; the neckband picked up all round it in 1 x 1 rib
  let m = Math.max(1, rnd(neck * .32)), c0 = neck - 2 * m; if (c0 < 2) { m = Math.max(0, Math.floor((neck - 2) / 2)); c0 = neck - 2 * m; }
  // 라운드넥 (Kim): the neck edge's gain by row r follows a quarter circle - steep at the shoulder, nothing gained
  // the first rows, more and more towards the bottom, flat where the middle is cast on
  const curve = (r: number) => (r <= 0 ? 0 : r >= ND ? m : Math.round(m * (1 - Math.sqrt(1 - (r / ND) ** 2))));
  const side = along(ND, g) + m, NB = 2 * Math.round((neck + c0 + 2 * side) / 2), NBr = Math.max(3, rnd(2.5 / g.h));
  return { bust, C, len, sleeveCm, T, neck, S, Half, AR, ND, e, U, N, BR, rib, pick, P, cuff, SRs, d, every, gained, m, c0, side, NB, NBr, curve };
}
export function planKnitTop(p: PlanInput, g: Gauge): Plan {
  const K = knitTop(p, g), { T, neck, S, AR, ND, U, N, BR, rib, P, d, every, SRs, gained } = K, rows: Row[] = [];
  const shareWhy = `가슴둘레 ${fmt(K.bust)}cm + 여유 ${TOP.ease}cm = ${fmt(K.C)}cm`;
  // 뒤판: from the shoulders down to the underarm, each edge gaining as it goes
  rows.push({ part: "panel", n: T, inc: 0, own: true, edge: [0, 0], label: "뒤판 코잡기", how: `대바늘에 ${T}코 잡기 (어깨에서 어깨까지)`,
    why: `${shareWhy}의 ${TOP.shoulder * 100}% ÷ 코 너비 ${mm(g.w)}mm = ${T}코 · 이 가장자리에서 나중에 앞판 어깨를 줍습니다` } as Row);
  for (let r = 1; r <= AR; r++) {
    const dd = gained(r) - gained(r - 1), n = T + 2 * gained(r);
    rows.push({ part: "panel", n, inc: 2 * dd, own: true, edge: [dd, dd], label: `뒤판 ${r}단`,
      how: dd ? `${r % 2 ? "겉면: 겉뜨기" : "안면: 안뜨기"}로 뜨며 양 끝에서 ${dd}코씩 늘리기 (${n}코)` : flatRow(r - 1, n),
      why: r === 1 ? `진동 깊이 ${fmt(K.C)}cm × ${TOP.armhole} ÷ 코 높이 ${mm(g.h)}mm = ${AR}단 · 양 끝에서 ${K.e}코씩, ${AR}단에 고르게 늘려 ${K.Half}코가 됩니다` : dd ? `${n - 2 * dd} + 늘림 ${2 * dd} = ${n}` : `${n}코 그대로` } as Row);
  }
  rows.push({ part: "panel", n: 0, inc: 0, own: true, label: "뒤판 쉬어 두기", how: `실을 자르고 ${K.Half}코는 쉼코로 둡니다`, why: "몸통에서 앞판과 함께 다시 뜹니다" } as Row);
  // 앞판: the shoulders picked up from the back's cast-on edge, the neck cast on between them
  const { m, c0, curve } = K;   // the neck edge's gain by row r (a quarter circle)
  for (let r = 1; r <= AR; r++) {
    const dd = gained(r) - gained(r - 1), nk = r <= ND ? curve(r) - curve(r - 1) : 0, sh = S + gained(r) + curve(Math.min(r, ND)), n = r <= ND ? 2 * sh : T + 2 * gained(r);
    const face = `${r % 2 ? "겉면: 겉뜨기" : "안면: 안뜨기"}로`;
    const how = r === 1 ? `뒤판 코잡기 가장자리의 양 끝에서 어깨 ${S}코씩 주워 두 어깨를 함께 뜹니다 (가운데 ${neck}코는 목 자리로 비웁니다)`
      : r === ND + 1 ? `왼쪽 어깨 ${sh - dd}코, 목 코 ${c0}코 만들기, 오른쪽 어깨 ${sh - dd}코를 이어 한 판으로 뜨며 양 끝에서 ${dd}코씩 늘리기 (${n}코)`
      : nk ? `${face} 뜨며 두 어깨의 목 쪽 가장자리에서 ${nk}코씩${nk > 1 ? "(감아코)" : ""}${dd ? `, 바깥 끝에서 ${dd}코씩` : ""} 늘리기 (어깨마다 ${sh}코)`
      : dd ? `${face} 뜨며 양 끝에서 ${dd}코씩 늘리기 (${n}코)` : flatRow(r - 1, n);
    const why = r === 1 ? `어깨 = (${T} - 목 ${neck}) ÷ 2 = ${S}코 · 목 너비 ${fmt(K.C)}cm × ${TOP.neck} ÷ 코 너비 · 목 깊이 ${ND}단(${fmt(K.C)}cm × ${TOP.neckDrop})`
      : r <= ND && nk && curve(r - 1) === 0 ? `라운드넥 · 목 쪽 가장자리의 늘림이 원을 따라 아래로 갈수록 많아집니다 (모두 ${m}코씩, 목 ${neck}코 중 ${2 * m}코)`
      : r === ND + 1 ? `어깨 둘 + 목 가운데 ${c0}코 = ${n}코 · (목 ${neck} = 늘림 ${2 * m} + 가운데 ${c0}) · 여기서부터 앞판이 한 판입니다` : nk ? `목 쪽 늘림 ${2 * nk}${dd ? ` · 바깥 늘림 ${2 * dd}` : ""}` : dd ? `양 끝 늘림 ${2 * dd}` : `${n}코 그대로`;
    rows.push({ part: "panel", n, inc: r === ND + 1 ? c0 + 2 * dd : 2 * dd + 2 * nk, own: true, edge: [dd, dd], label: `앞판 ${r}단`, how, why } as Row);
  }
  // 몸통: front and back joined under the arms, worked round
  rows.push({ part: "body", n: N, inc: 0, own: true, label: "몸통 1단", how: `앞판 ${K.Half}코, 겨드랑이 코 ${U}코 만들기, 뒤판 쉼코 ${K.Half}코, 겨드랑이 코 ${U}코 만들기로 이어 둘레로 겉뜨기 (${N}코)`,
    why: `${K.Half} + ${U} + ${K.Half} + ${U} = ${N}코 · 겨드랑이 코 ${fmt(K.C)}cm × ${TOP.underarm} ÷ 코 너비 · 시작 자리에 마커` } as Row);
  for (let i = 2; i <= BR; i++) rows.push({ part: "body", n: N, inc: 0, own: true, label: `몸통 ${i}단`, how: `모두 겉뜨기 ${N}코`, why: i === 2 ? `길이 ${fmt(K.len)}cm에서 진동 ${fmt(AR * g.h)}cm를 뺀 만큼 ÷ 코 높이 ${mm(g.h)}mm = ${BR}단` : `${N}코 그대로` } as Row);
  for (let i = 1; i <= rib; i++) rows.push({ part: "rim", n: N, inc: 0, own: true, label: `밑단 ${i}단`, how: `겉 1, 안 1 고무뜨기 ${N}코` + (i === rib ? " · 다 뜨면 고무뜨기대로 코막음" : ""), why: i === 1 ? `고무뜨기 4cm ÷ 코 높이 = ${rib}단` : `${N}코 그대로` } as Row);
  // 소매: picked up round the armhole, narrowed at the underarm to the cuff
  const pk = pickUp(2 * AR, K.pick);
  rows.push({ part: "strap", n: P, inc: 0, own: true, label: "소매 코 줍기", how: `겨드랑이 코 ${U}코 가운데에서 시작해 진동 둘레를 따라 ${pk.n}단에 ${pk.m}코씩 ${K.pick}코, 겨드랑이 코에서 ${U}코를 주워 둘레로 뜹니다 (${P}코)`,
    why: `진동 앞뒤 ${pickWhy(2 * AR, K.pick)} + 겨드랑이 ${U}코 = ${P}코 · 겨드랑이 가운데에 마커` } as Row);
  let n = P, made = 0;
  for (let i = 1; i <= SRs - rib; i++) {
    const cut = every && made < d && i % every === 0; if (cut) { n -= 2; made++; }
    rows.push({ part: "strap", n, inc: cut ? -2 : 0, own: true, label: `소매 ${i}단`, how: cut ? `마커 양쪽에서 1코씩 줄이며 겉뜨기 (${n}코)` : `모두 겉뜨기 ${n}코`,
      why: i === 1 ? (d ? `${every}단마다 마커 양쪽에서 1코씩 줄이기를 총 ${d}번 반복합니다 · ${P}코에서 소맷부리 ${P - 2 * d}코까지` : "줄임 없이 곧게 뜹니다") : cut ? `${n + 2} - 줄임 2 = ${n}` : `${n}코 그대로` } as Row);
  }
  for (let i = 1; i <= rib; i++) rows.push({ part: "strap", n, inc: 0, own: true, label: `소맷부리 ${i}단`, how: `겉 1, 안 1 고무뜨기 ${n}코` + (i === rib ? " · 다 뜨면 고무뜨기대로 코막음" : ""), why: i === 1 ? `소매 길이 ${fmt(K.sleeveCm)}cm ÷ 코 높이 = ${SRs}단 가운데 마지막 ${rib}단` : `${n}코 그대로` } as Row);
  rows.push({ part: "finish", n: 0, inc: 0, own: true, label: "소매 하나 더", how: "같은 방법으로 반대쪽 소매를 뜹니다", why: "코 수와 단 수는 위의 소매와 같습니다" } as Row);
  // 목둘레: picked up all round the neck, 1 x 1 rib
  rows.push({ part: "rim", n: K.NB, inc: 0, own: true, label: "목둘레 코 줍기", how: `뒷목 ${neck}코, 앞목 왼쪽 가장자리 ${K.side}코, 앞 가운데 ${c0}코, 오른쪽 가장자리 ${K.side}코를 주워 둘레로 뜹니다 (${K.NB}코)`,
    why: `앞목 옆선 ${ND}단에서 ${along(ND, g)}코 + 늘린 ${m}코 = ${K.side}코 · 겉 1, 안 1 고무뜨기라 짝수로 맞춥니다` } as Row);
  for (let i = 1; i <= K.NBr; i++) rows.push({ part: "rim", n: K.NB, inc: 0, own: true, label: `목둘레 ${i}단`, how: `겉 1, 안 1 고무뜨기 ${K.NB}코` + (i === K.NBr ? " · 다 뜨면 고무뜨기대로 느슨하게 코막음" : ""),
    why: i === 1 ? `목둘레 고무단 2.5cm ÷ 코 높이 ${mm(g.h)}mm = ${K.NBr}단` : `${K.NB}코 그대로` } as Row);
  return { g, c: T, rows: number(rows), bottomRounds: 0, bodyRows: BR, last: N };
}
