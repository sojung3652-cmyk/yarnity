// 위시 보관함's links (My Page, Kim): a pasted shop address -> its title, picture, shop name and price, read from
// the page's Open Graph / meta tags. Read-only; nothing is stored. POST (never cached) { url } -> { title?,
// image?, shop?, price? } or { error }. When nothing can be read the client lets the user type it in.
// Safety: http(s) only, no addresses inside a private network (checked again after every redirect), 6 seconds,
// at most 600KB of the page read.
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

export const runtime = "nodejs";

const TIMEOUT = 6000, MAX_BYTES = 600_000, MAX_REDIRECTS = 3;

function privateIp(ip: string): boolean {
  if (isIP(ip) === 6) {
    const v = ip.toLowerCase();
    if (v === "::1" || v === "::" || v.startsWith("fc") || v.startsWith("fd") || v.startsWith("fe80")) return true;
    const m = v.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/); return m ? privateIp(m[1]) : false;
  }
  const [a, b] = ip.split(".").map(Number);
  return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224;
}

async function safeUrl(raw: string): Promise<URL | null> {
  let u: URL;
  try { u = new URL(raw); } catch { return null; }
  if (u.protocol !== "http:" && u.protocol !== "https:") return null;
  if (u.username || u.password) return null;
  const host = u.hostname.replace(/^\[|\]$/g, "");
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal")) return null;
  try {
    const addrs = isIP(host) ? [{ address: host }] : await lookup(host, { all: true });
    if (!addrs.length || addrs.some(a => privateIp(a.address))) return null;
  } catch { return null; }
  return u;
}

async function fetchPage(start: URL, signal: AbortSignal): Promise<{ html: string; url: URL } | null> {
  let url = start;
  for (let i = 0; i <= MAX_REDIRECTS; i++) {
    const r = await fetch(url, { redirect: "manual", signal, headers: { "user-agent": "Mozilla/5.0 (compatible; YarnityLinkPreview/1.0)", accept: "text/html,application/xhtml+xml" } });
    if (r.status >= 300 && r.status < 400) {
      const next = r.headers.get("location"); if (!next) return null;
      const safe = await safeUrl(new URL(next, url).toString()); if (!safe) return null;
      url = safe; continue;
    }
    if (!r.ok || !(r.headers.get("content-type") ?? "").includes("html") || !r.body) return null;
    const reader = r.body.getReader(), chunks: Uint8Array[] = []; let n = 0;
    while (n < MAX_BYTES) { const { done, value } = await reader.read(); if (done) break; chunks.push(value); n += value.length; }
    reader.cancel().catch(() => {});
    const buf = new Uint8Array(n); let o = 0; for (const c of chunks) { buf.set(c.subarray(0, Math.min(c.length, n - o)), o); o += c.length; if (o >= n) break; }
    const ct = r.headers.get("content-type") ?? "", cs = /charset=([\w-]+)/i.exec(ct)?.[1];
    let html: string;
    try { html = new TextDecoder(cs || "utf-8").decode(buf); } catch { html = new TextDecoder().decode(buf); }
    return { html, url };
  }
  return null;
}

const decode = (s: string) => s.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;|&#x27;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#(\d+);/g, (_, d) => String.fromCharCode(+d)).trim();

function meta(html: string, keys: string[]): string | undefined {
  for (const tag of html.match(/<meta\b[^>]*>/gi) ?? []) {
    const key = /(?:property|name|itemprop)\s*=\s*["']([^"']+)["']/i.exec(tag)?.[1]?.toLowerCase();
    if (!key || !keys.includes(key)) continue;
    const v = /content\s*=\s*["']([^"']*)["']/i.exec(tag)?.[1];
    if (v && v.trim()) return decode(v).slice(0, 300);
  }
}

export async function POST(req: Request) {
  let raw = "";
  try { raw = String((await req.json())?.url ?? "").trim(); } catch { return Response.json({ error: "bad_request" }, { status: 400 }); }
  const url = await safeUrl(raw);
  if (!url) return Response.json({ error: "bad_url" }, { status: 400 });
  const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), TIMEOUT);
  try {
    const page = await fetchPage(url, ctl.signal);
    if (!page) return Response.json({ error: "unreadable" }, { status: 422 });
    const { html } = page;
    const title = meta(html, ["og:title", "twitter:title"]) ?? (/<title[^>]*>([^<]{1,300})<\/title>/i.exec(html)?.[1] ? decode(/<title[^>]*>([^<]{1,300})<\/title>/i.exec(html)![1]) : undefined);
    let image = meta(html, ["og:image", "og:image:url", "og:image:secure_url", "twitter:image"]);
    if (image) { try { const iu = new URL(image, page.url); image = iu.protocol === "https:" || iu.protocol === "http:" ? iu.toString() : undefined; } catch { image = undefined; } }
    const shop = meta(html, ["og:site_name", "application-name"]) ?? page.url.hostname.replace(/^www\./, "");
    const amount = meta(html, ["product:price:amount", "og:price:amount", "price"]);
    const currency = meta(html, ["product:price:currency", "og:price:currency", "pricecurrency"]);
    const price = amount ? (currency && currency.toUpperCase() !== "KRW" ? `${amount} ${currency}` : `${Number(amount.replace(/[^\d.]/g, "")).toLocaleString("ko-KR")}원`) : undefined;
    return Response.json({ title, image, shop, price });
  } catch {
    return Response.json({ error: "unreadable" }, { status: 422 });
  } finally { clearTimeout(t); }
}
