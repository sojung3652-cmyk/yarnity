// Server route for the shape-planning chat.
// Replaces the prototype's window.claude.use("sample"), which only existed inside Claude.
// The API key stays on the server (.env.local -> ANTHROPIC_API_KEY).
import Anthropic from "@anthropic-ai/sdk";
import { RULES, STREAM_ERR, TITLE_RULE, type ChatErrorCode, type ChatRequest } from "@/lib/chat";

export const runtime = "nodejs";

// Haiku, always (Kim: the API cost). Not taken from ANTHROPIC_MODEL, so a server variable left on a bigger
// model cannot raise the bill; change it here on purpose if ever needed.
const MODEL = "claude-haiku-5-5";
// A reply is 2-4 sentences + a small JSON object (~300 tokens). 1500 leaves headroom so the
// JSON is never cut off mid-object (Rule 5; the prototype's truncation bug).
const MAX_TOKENS = 1500;
const MEDIA = new Set(["image/jpeg", "image/png", "image/gif", "image/webp"]);
const MAX_IMAGE_B64 = 7_000_000; // ~5MB decoded, the API's per-image limit

const fail = (error: ChatErrorCode, status: number) => Response.json({ error }, { status });

// GET: lets the client decide whether to show the composer. Without a key the UI falls back to
// the form-only flow (the prototype's offChat()), so the app still works with no AI at all.
export function GET() {
  return Response.json({ available: !!process.env.ANTHROPIC_API_KEY, images: true });
}

export async function POST(req: Request) {
  if (!process.env.ANTHROPIC_API_KEY) return fail("not_configured", 503);

  let body: ChatRequest;
  try { body = await req.json(); } catch { return fail("bad_request", 400); }
  const msgs = Array.isArray(body?.messages) ? body.messages.filter(m => (m.role === "user" || m.role === "assistant") && typeof m.content === "string") : [];
  // The client sends its last 12 turns; the API needs the first message to be from the user.
  while (msgs.length && msgs[0].role !== "user") msgs.shift();
  if (!msgs.length || msgs[msgs.length - 1].role !== "user") return fail("bad_request", 400);

  const img = body.image;
  if (img && (!MEDIA.has(img.mediaType) || typeof img.data !== "string" || img.data.length > MAX_IMAGE_B64)) return fail("image_rejected", 400);

  const messages: Anthropic.MessageParam[] = msgs.map((m, i) => {
    if (i === msgs.length - 1 && img) {
      // The photo goes only with the current turn, as in the prototype.
      return { role: "user", content: [
        { type: "image", source: { type: "base64", media_type: img.mediaType, data: img.data } },
        { type: "text", text: m.content },
      ] };
    }
    return { role: m.role, content: m.content };
  });

  const code = (e: unknown): ChatErrorCode => {
    if (e instanceof Anthropic.AuthenticationError || e instanceof Anthropic.PermissionDeniedError) return "not_granted";
    if (e instanceof Anthropic.RateLimitError) return "rate_limited";
    if (e instanceof Anthropic.BadRequestError && img && /image/i.test(e.message)) return "image_rejected";
    console.error("[api/chat]", e);
    return "upstream";
  };
  const STATUS: Record<string, number> = { not_granted: 502, rate_limited: 429, image_rejected: 400, upstream: 502 };

  // The answer streams (Kim: the words come as they are written): the model's text as it arrives, as plain
  // text. The client reads the "reply" string out of the JSON while it grows (lib/chat partialReply) and parses
  // the whole with safeParseReply at the end (Rule 5). An error before the first word keeps its status (the
  // client shows the same notes as before); one after it ends the stream with STREAM_ERR + its code.
  // Stopping in the client (그만) aborts the request: req.signal ends the model's stream too, so no tokens are
  // paid for after it.
  const client = new Anthropic(); // reads ANTHROPIC_API_KEY
  const stream = client.messages.stream(
    { model: MODEL, max_tokens: MAX_TOKENS, system: RULES + (body.wantTitle ? TITLE_RULE : ""), messages },
    { signal: req.signal },
  );
  // wait for the first piece, so an error that comes at once still gets its status code
  const it = stream[Symbol.asyncIterator]();
  let first: IteratorResult<Anthropic.MessageStreamEvent>;
  try { first = await it.next(); } catch (e) { const c = code(e); return fail(c, STATUS[c] ?? 502); }

  const enc = new TextEncoder();
  const body2 = new ReadableStream<Uint8Array>({
    async start(ctl) {
      let refused = false;
      const take = (ev: Anthropic.MessageStreamEvent) => {
        if (ev.type === "content_block_delta" && ev.delta.type === "text_delta") ctl.enqueue(enc.encode(ev.delta.text));
        if (ev.type === "message_delta" && ev.delta.stop_reason === "refusal") refused = true;
      };
      try {
        if (!first.done) take(first.value);
        for (let r = await it.next(); !r.done; r = await it.next()) take(r.value);
        if (refused) ctl.enqueue(enc.encode(`\n${STREAM_ERR}refused`));
      } catch (e) {
        if (!req.signal.aborted) ctl.enqueue(enc.encode(`\n${STREAM_ERR}${code(e)}`));
      } finally {
        try { ctl.close(); } catch {}
      }
    },
    cancel() { stream.abort(); },
  });
  return new Response(body2, { headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store", "x-accel-buffering": "no" } });
}
