"use client";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useApp } from "@/components/AppProvider";
import { Chat } from "@/components/Chat";
import { PrepForm, fieldsFromDraft, readForm, type Fields } from "@/components/PrepForm";
import { clamp, SHAPE_KO, type Shape } from "@/lib/pattern";
import type { Draft } from "@/lib/types";

export default function NewPage() {
  const { ready, draft, setDraft, addProject } = useApp();
  const router = useRouter();
  const [fields, setFields] = useState<Fields | null>(null);

  // fillForm() on entering the view
  useEffect(() => { if (ready) setFields(fieldsFromDraft(draft)); }, [ready]); // eslint-disable-line react-hooks/exhaustive-deps

  const update = useCallback((f: Fields, d: Draft) => { setFields(f); setDraft(readForm(f, d)); }, [setDraft]);

  // AI chat -> form (prototype applySet)
  const applySet = useCallback((s: unknown): string[] => {
    if (!s || typeof s !== "object") return [];
    const v = s as Record<string, unknown>, d = { ...draft }, out: string[] = [];
    if (v.object === "coaster" || v.object === "bag") { d.object = v.object; out.push(v.object === "bag" ? "미니 손가방" : "미니 코스터"); }
    if (["circle", "oval", "rect"].includes(v.shape as string)) { d.shape = v.shape as Shape; out.push(SHAPE_KO[d.shape] + " 바닥"); }
    if (+(v.a as number) > 0) { d.a = clamp(+(v.a as number), 4, 40); out.push((d.shape === "circle" ? "지름 " : "길이 ") + d.a + "cm"); }
    if (+(v.b as number) > 0) { d.b = clamp(+(v.b as number), 4, 30); out.push("폭 " + d.b + "cm"); }
    if (+(v.h as number) > 0) { d.h = clamp(+(v.h as number), 2, 40); out.push("높이 " + d.h + "cm"); }
    if (["short", "long", "none"].includes(v.handle as string)) { d.handle = v.handle as Draft["handle"]; out.push({ short: "짧은 끈", long: "긴 끈", none: "손잡이 없음" }[d.handle]); }
    if (out.length) { setDraft(d); setFields(fieldsFromDraft(d)); }
    return out;
  }, [draft, setDraft]);

  const make = () => {
    if (!fields) return;
    const d = readForm(fields, draft); setDraft(d);
    if (d.shape !== "circle" && d.b >= d.a) { d.b = Math.max(4, d.a - 2); setDraft(d, false); }
    const id = "p" + Date.now().toString(36);
    addProject({ id, ...JSON.parse(JSON.stringify(d)), measuredH: null, current: 0, created: Date.now() });
    router.push("/pattern");
  };

  return (
    <main id="view-new">
      <div className="app-head">
        <div><div className="steps"><span className="on">준비물과 모양</span><span>도안</span><span>따라 뜨기</span></div><h1>무엇을 뜰까요?</h1></div>
        <button className="btn btn-primary" id="makeBtn" type="button" onClick={make}>도안 만들기</button>
      </div>
      <div className="grid-2">
        {fields ? <PrepForm fields={fields} draft={draft} onChange={update} /> : <form className="card" />}
        <Chat draft={draft} applySet={applySet} />
      </div>
    </main>
  );
}
