// A picture of every 기본형 for its card (Kim: 기본형은 그래픽을 미리보기로): the starter pressed in 도안 만들기, its
// 3D on the light background, cut square round the piece and saved small as public/protos/<id>.webp.
// Usage: node shoot-protos.cjs <repo> [id,id,...]        (needs the dev server: BASE, default http://localhost:3000)
// The cards are found by their name (.ask-card-name) in the group chips (.ask-chips) one after another; a
// starter of a family (호보백) is reached through its family's card, then by its own name there (`choice`).
// Kim: 밝은 배경에 색 있는 실로 - each starter in one of the basic colours (in turn), on the light background.
const COLOURS = ["연핑크", "하늘", "세이지 그린", "버터 노랑", "살구", "모카 브라운"];
const fs = require("fs"), path = require("path");
const root = process.argv[2], only = process.argv[3] ? process.argv[3].split(",") : null;
const { chromium } = require(root + "/node_modules/playwright");
const BASE = process.env.BASE || "http://localhost:3000", OUT = path.join(root, "public", "protos");
// the starters in the order the list shows them: the bag and pouch kinds, then every other item once
const kinds = [...fs.readFileSync(path.join(root, "lib/prototypes.ts"), "utf8").matchAll(/^\s*\{ id: "(\w+)", group: "[^"]+", name: "([^"]+)"(?:[^\n]*?family: "([^"]+)", choice: \["([^"]+)")?/gm)].map(m => ({ id: m[1], name: m[2], family: m[3], choice: m[4] }));
const items = [...fs.readFileSync(path.join(root, "lib/items.ts"), "utf8").matchAll(/^\s*\{ id: "(\w+)", name: "([^"]+)"/gm)].map(m => ({ id: m[1], name: m[2] })).filter(x => !["minibag", "bucket", "pouch"].includes(x.id) && !kinds.some(k => k.id === x.id)); // (a starter-only item - 모자, 소품 - is a kind already)
// (items shown on another card - lib/prototypes SAME_AS - have no card of their own; an item that is also a starter is shot once)
const sameAs = new Set([...((fs.readFileSync(path.join(root, "lib/prototypes.ts"), "utf8").match(/const SAME_AS[^{]*\{([^}]*)\}/) || [, ""])[1]).matchAll(/(\w+):/g)].map(m => m[1]));
const all = [...kinds, ...items.filter(x => !sameAs.has(x.id) && !kinds.some(k => k.id === x.id))];
(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ args: ["--use-angle=d3d11", "--enable-gpu"] });
  const todo = all.filter(x => !only || only.includes(x.id)), failed = [];
  const press = async (page, name, chips = true) => {
    const groups = chips ? page.locator(".ask-chips button") : null, ng = groups ? await groups.count() : 1;
    for (let k = 0; k < Math.max(1, ng); k++) {
      if (groups && ng) { await groups.nth(k).click(); await page.waitForTimeout(250); }
      const btns = page.locator(".ask-protos .ask-card"), n = await btns.count();
      for (let i = 0; i < n; i++) { const t = (await btns.nth(i).evaluate(b => (b.querySelector(".ask-card-name") || b.childNodes[0]).textContent || "")).trim(); if (t === name) { await btns.nth(i).click(); return; } }
    }
    throw new Error("no card named " + name);
  };
  const one = async (s, idx) => {
    const page = await browser.newPage({ viewport: { width: 1500, height: 950 } });
    try {
      await page.addInitScript(() => { if (!sessionStorage.getItem("seeded")) { localStorage.clear(); sessionStorage.setItem("seeded", "1"); } });
      await page.goto(BASE + "/new?step=1", { waitUntil: "networkidle" });
      await page.getByText("새로 시작", { exact: true }).first().click(); await page.waitForTimeout(1200);
      await page.getByText("다음 · 실 고르기").first().click(); await page.waitForTimeout(2200);
      await page.locator(`[aria-label="기본 색"] button[aria-label="${COLOURS[idx % COLOURS.length]}"]`).first().click(); await page.waitForTimeout(300);
      await page.locator("#yMm").fill("3");
      await page.getByText("모양 만들기").first().click(); await page.waitForTimeout(1800);
      await page.getByText("기본형으로 시작하기").first().click(); await page.waitForTimeout(1200);
      if (s.family && s.choice) { await press(page, s.family); await page.waitForTimeout(500); await press(page, s.choice, false); } else await press(page, s.name);
      await page.waitForTimeout(9000);
      // further away, so a wide piece is whole in the square; the light background (Kim)
      for (let k = 0; k < 2; k++) { await page.getByRole("button", { name: "축소", exact: true }).first().click(); await page.waitForTimeout(500); }
      await page.getByText("밝게", { exact: true }).first().click(); await page.waitForTimeout(2200);
      const shot = await page.screenshot({ clip: { x: 250, y: 196, width: 620, height: 620 } });
      // made small in the page itself (no image library): 360 x 360 webp
      const url = await page.evaluate(async b64 => { const img = new Image(); img.src = "data:image/png;base64," + b64; await img.decode(); const c = document.createElement("canvas"); c.width = c.height = 360; const x = c.getContext("2d"); x.imageSmoothingQuality = "high"; x.drawImage(img, 0, 0, 360, 360); return c.toDataURL("image/webp", .86); }, shot.toString("base64"));
      fs.writeFileSync(path.join(OUT, s.id + ".webp"), Buffer.from(url.split(",")[1], "base64"));
      console.log("ok", s.id, s.name, fs.statSync(path.join(OUT, s.id + ".webp")).size);
    } catch (e) { failed.push(s.id); console.log("FAILED", s.id, s.name, String(e.message).split("\n")[0].slice(0, 140)); }
    await page.close();
  };
  // (a starter keeps its colour whether shot alone or with the others: its place in the whole list)
  const at = s => all.findIndex(x => x.id === s.id);
  for (let i = 0; i < todo.length; i += 3) await Promise.all(todo.slice(i, i + 3).map(s => one(s, at(s))));
  console.log("done:", todo.length - failed.length, "of", todo.length, failed.length ? "failed: " + failed.join(",") : "");
  await browser.close();
})().catch(e => { console.error("FAILED", e.message.slice(0, 500)); process.exit(1); });
