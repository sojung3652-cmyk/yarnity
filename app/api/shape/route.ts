// 그려서 만들기 (Kim): Claude reads a sketch of a whole piece (a bag, a pouch...) and returns its shape as
// numbers the pattern engine and the 3D use. The key stays on the server (.env.local -> ANTHROPIC_API_KEY).
// The answer is a forced tool call (structured), still checked on the client (lib/sketchShape readSpec: Rule 5).
// Without a key or on any failure the client keeps the sketch and says so; nothing else depends on this (Rule 6).
import Anthropic from "@anthropic-ai/sdk";

export const runtime = "nodejs";

// Haiku, always (Kim: the API cost), as /api/chat
const MODEL = "claude-haiku-5-5";
// the answer is one small object (~250 tokens); 1024 leaves room so it is never cut off (Rule 5)
const MAX_TOKENS = 1024;
const MEDIA = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_IMAGE_B64 = 7_000_000;

const TOOL: Anthropic.Tool = {
  name: "shape",
  description: "The crochet piece the sketch shows, as its maker intends it.",
  input_schema: {
    type: "object",
    properties: {
      kind: { type: "string", enum: ["bag", "pouch", "basket", "coaster", "other"], description: "a bag with a handle, a pouch without one, an open basket, a flat coaster or mat" },
      bottom: { type: "string", enum: ["circle", "oval", "rect"], description: "the bottom's outline seen from above (a handbag with a flat base: rect)" },
      widthCm: { type: "number", description: "width of the BOTTOM edge of the body as drawn (the lowest line), in cm (estimate from the kind if no size is written: a small handbag ~22)" },
      depthCm: { type: "number", description: "front-to-back depth of the bottom in cm" },
      heightCm: { type: "number", description: "height of the body without the handle, in cm" },
      topWidthCm: { type: "number", description: "width of the TOP edge of the body (the opening, where the handle or flap starts), in cm, in the same proportion to widthCm as in the drawing" },
      body: { type: "string", enum: ["straight", "wider", "narrower"], description: "compare the top edge with the bottom edge: 'narrower' when the top edge is shorter than the bottom (a trapezoid handbag), 'wider' when the top edge is longer, 'straight' when about equal" },
      flap: { type: "string", enum: ["none", "half", "square", "triangle"], description: "a flap over the opening and its outline: half (a half-moon / rounded), square, triangle" },
      flapCm: { type: "number", description: "how far the flap reaches down the front, in cm" },
      handles: { type: "integer", enum: [0, 1, 2], description: "0 none, 1 one handle across the top, 2 two handles (front and back)" },
      handleCm: { type: "number", description: "the handle's length in cm" },
      button: { type: "boolean" },
      buttonX: { type: "number", description: "-1 left .. 0 middle .. 1 right, on the front" },
      buttonY: { type: "number", description: "0 bottom .. 1 top of the body" },
      buttonSizeCm: { type: "number" },
      buttonColor: { type: "string", description: "'gold', 'silver', 'wood' or a hex colour" },
      zipper: { type: "boolean" },
      label: { type: "boolean" },
      bodyColor: { type: "string", description: "the yarn colour as #RRGGBB (from the note or the drawing; omit if none)" },
      colorName: { type: "string", description: "the colour's name in Korean" },
      summary: { type: "string", description: "one short Korean sentence in 합니다체 describing what was read" },
    },
    required: ["kind", "bottom", "widthCm", "depthCm", "heightCm", "body", "flap", "handles", "button", "summary"],
  },
};

const RULES = `You read a hand-drawn sketch of a piece someone wants to crochet and describe its intended shape for a pattern maker.
Keep the shape the maker meant: proportions, a narrowing or widening body, a flap and its outline, the handle's arc, a button and where it sits.
Lines that are clearly the same edge drawn twice are one edge; a small spiral or circle on a flap is usually a button or clasp.
Measure the drawing: the top edge of the body against its bottom edge decides whether it narrows or widens upward.
Use the maker's note for colours and materials when given. Answer only by calling the tool. The summary is Korean in 합니다체.`;

export function GET() { return Response.json({ available: !!process.env.ANTHROPIC_API_KEY }); }

export async function POST(req: Request) {
  if (!process.env.ANTHROPIC_API_KEY) return Response.json({ error: "not_configured" }, { status: 503 });
  let body: { image?: { mediaType: string; data: string }; note?: string };
  try { body = await req.json(); } catch { return Response.json({ error: "bad_request" }, { status: 400 }); }
  const img = body.image;
  if (!img || !MEDIA.has(img.mediaType) || typeof img.data !== "string" || !img.data || img.data.length > MAX_IMAGE_B64) return Response.json({ error: "image_rejected" }, { status: 400 });
  const note = typeof body.note === "string" ? body.note.replace(/[<>]/g, "").slice(0, 200) : "";
  const client = new Anthropic();
  try {
    const res = await client.messages.create({
      model: MODEL, max_tokens: MAX_TOKENS, system: RULES,
      tools: [TOOL], tool_choice: { type: "tool", name: "shape" },
      messages: [{ role: "user", content: [
        { type: "image", source: { type: "base64", media_type: img.mediaType as "image/png", data: img.data } },
        { type: "text", text: note ? `만드는 사람의 메모: ${note}` : "메모 없음" },
      ] }],
    });
    const use = res.content.find(c => c.type === "tool_use");
    if (!use || use.type !== "tool_use") return Response.json({ error: "no_shape" }, { status: 502 });
    return Response.json({ shape: use.input });
  } catch (e) {
    const code = e instanceof Anthropic.AuthenticationError || e instanceof Anthropic.PermissionDeniedError ? "not_granted"
      : e instanceof Anthropic.RateLimitError ? "rate_limited" : "failed";
    return Response.json({ error: code }, { status: 502 });
  }
}
