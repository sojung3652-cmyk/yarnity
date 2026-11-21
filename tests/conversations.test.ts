import { describe, expect, it } from "vitest";
import { partialReply, safeParseReply } from "@/lib/chat";
import { apiTurns, dayGroup, migrate, turnsOf, type Conversation } from "@/lib/conversations";

describe("partialReply (the answer while it streams)", () => {
  it("is empty before the reply starts", () => {
    expect(partialReply("")).toBe("");
    expect(partialReply('{"rep')).toBe("");
  });
  it("grows with the reply, cut anywhere", () => {
    const full = '{"reply":"짧은뜨기 \\"6코\\"로\\n시작해요","set":{},"chips":[]}';
    expect(partialReply(full)).toBe('짧은뜨기 "6코"로\n시작해요');
    expect(partialReply(full.slice(0, 15))).toBe("짧은뜨기 ");
    // an escape cut in half waits for the next piece
    expect(partialReply('{"reply":"a\\')).toBe("a");
    expect(partialReply('{"reply":"a\\u00')).toBe("a");
    expect(partialReply('{"reply":"a\\u00e9b')).toBe("aéb");
  });
});

describe("the title with the first answer", () => {
  it("is read and kept to 20 characters", () => {
    expect(safeParseReply('{"reply":"네","title":"여름 미니 가방 상담"}')?.title).toBe("여름 미니 가방 상담");
    expect(safeParseReply(`{"reply":"네","title":"${"가".repeat(30)}"}`)?.title).toHaveLength(20);
    expect(safeParseReply('{"reply":"네"}')).not.toHaveProperty("title");
  });
});

const conv = (p: Partial<Conversation>): Conversation => ({ id: "c1", title: "t", created: 0, updated: 0, msgs: [], ...p });

describe("migrate (older saves kept the turns apart)", () => {
  it("puts each turn on its message; the help shown first and a failed question get none", () => {
    const c = migrate(conv({
      msgs: [
        { role: "assistant", text: "help", at: 1 },
        { role: "user", text: "q1", at: 2 },
        { role: "note", text: "끊겼어요", at: 3 },
        { role: "user", text: "q2", at: 4 },
        { role: "assistant", text: "a2", at: 5 },
      ],
      turns: [{ role: "user", content: "q2+state" }, { role: "assistant", content: '{"reply":"a2"}' }],
    }));
    expect(c.turns).toBeUndefined();
    expect(c.msgs.map(m => m.turn)).toEqual([undefined, undefined, undefined, "q2+state", '{"reply":"a2"}']);
    expect(turnsOf(c.msgs)).toEqual([{ role: "user", content: "q2+state" }, { role: "assistant", content: '{"reply":"a2"}' }]);
  });
});

describe("turnsOf", () => {
  it("leaves out a question whose answer did not come", () => {
    const t = turnsOf([
      { role: "user", text: "q1", turn: "q1", at: 1 },
      { role: "note", text: "x", at: 2 },
      { role: "user", text: "q2", turn: "q2", at: 3 },
    ]);
    expect(t).toEqual([{ role: "user", content: "q2" }]);
    expect(apiTurns(t)[0].role).toBe("user");
  });
});

describe("dayGroup", () => {
  const now = new Date(2026, 10, 21, 15, 0).getTime();
  it("오늘 / 어제 / 지난 7일 / 이전", () => {
    expect(dayGroup(new Date(2026, 10, 21, 9).getTime(), now)).toBe("오늘");
    expect(dayGroup(new Date(2026, 10, 20, 23).getTime(), now)).toBe("어제");
    expect(dayGroup(new Date(2026, 10, 16, 12).getTime(), now)).toBe("지난 7일");
    expect(dayGroup(new Date(2026, 10, 1).getTime(), now)).toBe("이전");
  });
});
