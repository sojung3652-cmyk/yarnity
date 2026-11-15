import { describe, expect, it } from "vitest";
import { safeParseReply } from "@/lib/chat";

describe("safeParseReply", () => {
  it("parses a clean reply", () => {
    expect(safeParseReply('{"reply":"좋아요","set":{"shape":"circle","a":15},"chips":["네","아니요"]}'))
      .toEqual({ reply: "좋아요", set: { shape: "circle", a: 15 }, chips: ["네", "아니요"] });
  });
  it("strips code fences and surrounding prose", () => {
    expect(safeParseReply('여기요\n```json\n{"reply":"네","set":{},"chips":[]}\n```')?.reply).toBe("네");
  });
  it("recovers from a missing closing brace", () => {
    expect(safeParseReply('{"reply":"반쯤","set":{"a":10},"chips":["x"]')?.set).toEqual({ a: 10 });
  });
  it("salvages the reply text from badly truncated JSON", () => {
    expect(safeParseReply('{"reply":"잘린 답이에요","set":{"a":1')?.reply).toBe("잘린 답이에요");
  });
  it("normalizes wrong types and returns null on garbage", () => {
    expect(safeParseReply('{"reply":3,"set":[1],"chips":"x"}')).toEqual({ reply: "", set: {}, chips: [] });
    expect(safeParseReply("no json here")).toBeNull();
  });
});
