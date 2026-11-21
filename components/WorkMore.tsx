"use client";
// The work's ··· on the web's 도안 보기 and 따라 뜨기 (Kim): small (a 20px icon, warm grey) at the right end of the title
// row, with the work's own actions - 고치기, 이름 바꾸기, 지우기 (asks first) - as the app's ··· sheet. The ways to other
// screens are in the NavBar.
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useApp } from "@/components/AppProvider";
import { useBook } from "@/components/Book/BookProvider";
import type { Project } from "@/lib/types";

export function WorkMore({ p }: { p: Project }) {
  const { updateProject, removeProjects } = useApp(), book = useBook(), router = useRouter();
  const [open, setOpen] = useState(false), [mode, setMode] = useState<"menu" | "rename" | "delete">("menu"), [name, setName] = useState(p.name);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const off = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", off); document.addEventListener("keydown", key);
    return () => { document.removeEventListener("mousedown", off); document.removeEventListener("keydown", key); };
  }, [open]);
  const toggle = () => { setMode("menu"); setName(p.name); setOpen(o => !o); };
  return (
    <div className="wmore" ref={box}>
      <button type="button" className="wmore-btn" aria-label="작품 더 보기" aria-haspopup="menu" aria-expanded={open} onClick={toggle}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5.5" cy="12" r="1.6" fill="currentColor" /><circle cx="12" cy="12" r="1.6" fill="currentColor" /><circle cx="18.5" cy="12" r="1.6" fill="currentColor" /></svg>
      </button>
      {open && (
        <div className="wmore-menu" role="menu">
          {mode === "menu" && <>
            <button type="button" role="menuitem" onClick={() => { setOpen(false); book.editHere(p.id); }}>고치기</button>
            <button type="button" role="menuitem" onClick={() => setMode("rename")}>이름 바꾸기</button>
            <button type="button" role="menuitem" className="danger" onClick={() => setMode("delete")}>지우기</button>
          </>}
          {mode === "rename" && (
            <form className="wmore-rename" onSubmit={e => { e.preventDefault(); const n = name.trim().slice(0, 30); if (n) updateProject(p.id, { name: n }); setOpen(false); }}>
              <label className="sr" htmlFor="wmoreName">작품 이름</label>
              <input id="wmoreName" autoFocus maxLength={30} value={name} onChange={e => setName(e.target.value)} />
              <button type="submit">저장</button>
            </form>
          )}
          {mode === "delete" && (
            <div className="wmore-ask" role="alert">
              <p>이 작품을 지울까요? 되돌릴 수 없어요.</p>
              <button type="button" onClick={() => setMode("menu")}>취소</button>
              <button type="button" className="danger" onClick={() => { setOpen(false); removeProjects([p.id]); router.push("/mine"); }}>지우기</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
