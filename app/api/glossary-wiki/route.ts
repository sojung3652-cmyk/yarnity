// 뜨개 사전 · 커뮤니티 표현 위키 (Kim): the shared edits of the community terms' 설명, kept in Supabase
// (supabase/glossary_wiki.sql: table glossary_edits, read by all, insert-only, throttled).
//   GET                -> { latest: { [termId]: Edit } }   the newest 판 of every community term
//   GET ?term=<id>     -> { history: Edit[] }               that term's 판s, newest first (at most 50)
//   POST { term, summary, author?, note?, reverts? } -> { edit } | { error }
// Why a route and not the browser: one place checks the term is a community one and the lengths, and the
// Supabase address and key stay on the server (.env.local: SUPABASE_URL, SUPABASE_ANON_KEY).
// Not set up (no env) or Supabase down -> 503 { error: "off" }: the glossary then shows the built-in 설명 only and
// hides 고치기 - the wiki is extra, the glossary must keep working without it (Rule 6, don't "simplify" this away).
import { TERMS } from "@/lib/glossary";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COMMUNITY = new Set(TERMS.filter(t => t.category === "community").map(t => t.id));
const URL_ = process.env.SUPABASE_URL, KEY = process.env.SUPABASE_ANON_KEY;
const COLS = "id,term_id,summary,author,note,reverts,created_at";

const off = () => Response.json({ error: "off" }, { status: 503 });
const db = (path: string, init?: RequestInit) =>
  fetch(`${URL_}/rest/v1/${path}`, { ...init, cache: "no-store", signal: AbortSignal.timeout(6000),
    // the publishable key goes in apikey only (it is not a JWT, so no Bearer header)
    headers: { apikey: KEY!, "content-type": "application/json", ...(init?.headers ?? {}) } });

export async function GET(req: Request) {
  if (!URL_ || !KEY) return off();
  const term = new URL(req.url).searchParams.get("term");
  try {
    if (term) {
      if (!COMMUNITY.has(term)) return Response.json({ error: "term" }, { status: 400 });
      const r = await db(`glossary_edits?select=${COLS}&term_id=eq.${encodeURIComponent(term)}&order=id.desc&limit=50`);
      if (!r.ok) return off();
      return Response.json({ history: await r.json() });
    }
    const ids = [...COMMUNITY].map(encodeURIComponent).join(",");
    const r = await db(`glossary_edits?select=${COLS}&term_id=in.(${ids})&order=id.desc&limit=500`);
    if (!r.ok) return off();
    const latest: Record<string, unknown> = {};
    for (const e of (await r.json()) as { term_id: string }[]) if (!(e.term_id in latest)) latest[e.term_id] = e;
    return Response.json({ latest });
  } catch { return off(); }
}

const clean = (v: unknown, max: number) => (typeof v === "string" ? v.replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, "").trim().slice(0, max) : "");

export async function POST(req: Request) {
  if (!URL_ || !KEY) return off();
  let b: Record<string, unknown>;
  try { b = await req.json(); } catch { return Response.json({ error: "body" }, { status: 400 }); }
  const term = clean(b.term, 64), summary = clean(b.summary, 600), author = clean(b.author, 20) || "익명", note = clean(b.note, 80) || null;
  const reverts = Number.isInteger(b.reverts) && (b.reverts as number) > 0 ? b.reverts : null;
  if (!COMMUNITY.has(term)) return Response.json({ error: "term" }, { status: 400 });
  if (summary.length < 2) return Response.json({ error: "short" }, { status: 400 });
  try {
    const r = await db(`glossary_edits?select=${COLS}`, { method: "POST", headers: { prefer: "return=representation" },
      body: JSON.stringify({ term_id: term, summary, author, note, reverts }) });
    if (!r.ok) {
      const t = await r.text();
      if (t.includes("too many edits")) return Response.json({ error: "busy" }, { status: 429 });
      return off();
    }
    const [edit] = await r.json();
    return Response.json({ edit });
  } catch { return off(); }
}
