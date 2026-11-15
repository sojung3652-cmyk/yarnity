// Server route for the shape-planning chat.
// Replaces the prototype's window.claude.use("sample"), which only existed inside Claude.
// The API key stays on the server (.env.local -> ANTHROPIC_API_KEY).
import Anthropic from "@anthropic-ai/sdk";
import { RULES, safeParseReply, type ChatErrorCode, type ChatRequest } from "@/lib/chat";

export const runtime = "nodejs";

const MODEL = process.env.ANTHROPIC_MODEL || "claude-opus-5-5";
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

  try {
    const client = new Anthropic(); // reads ANTHROPIC_API_KEY
    const res = await client.messages.create({ model: MODEL, max_tokens: MAX_TOKENS, system: RULES, messages });
    if (res.stop_reason === "refusal") return fail("refused", 200);
    const text = res.content.map(b => (b.type === "text" ? b.text : "")).join("");
    const parsed = safeParseReply(text);
    if (!parsed) return fail("invalid_json", 502);
    return Response.json(parsed);
  } catch (e) {
    if (e instanceof Anthropic.AuthenticationError || e instanceof Anthropic.PermissionDeniedError) return fail("not_granted", 502);
    if (e instanceof Anthropic.RateLimitError) return fail("rate_limited", 429);
    if (e instanceof Anthropic.BadRequestError && img && /image/i.test(e.message)) return fail("image_rejected", 400);
    console.error("[api/chat]", e);
    return fail("upstream", 502);
  }
}
