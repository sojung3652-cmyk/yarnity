"use client";
// 사진으로 만들기 (Kim: 그리기 너무 머리아프다 - drawing replaced by adding a photo). A photo of the piece wanted -
// a shop picture, a finished bag, one saved from the web, or a sketch on paper - goes to Claude (app/api/shape),
// which reads it as it reads a drawing: the silhouette, the depth, a flap, handles, a button, the colours. The
// draft follows (lib/sketchShape), and with it the pattern and the 3D. Without the AI the photo is kept and the
// parts can still be put together by hand (조립하기) - nothing else depends on this (Rule 6).
import { useRef, useState } from "react";
import { readSpec, type ShapeSpec } from "@/lib/sketchShape";

const ERR: Record<string, string> = {
  not_configured: "지금은 AI가 연결되어 있지 않습니다. 조립하기에서 부품을 골라 만들어 주십시오.",
  not_granted: "AI 사용 권한이 없습니다. 조립하기에서 부품을 골라 만들어 주십시오.",
  rate_limited: "AI가 잠시 바쁩니다. 조금 뒤에 다시 눌러 주십시오.",
  image_rejected: "사진을 보내지 못했습니다. 다른 사진으로 해 주십시오.",
};
// the photo made small enough to send (the long side 1280px, JPEG): a phone photo is often 5MB or more
const shrink = (src: string) => new Promise<string>((ok, no) => {
  const im = new Image();
  im.onload = () => {
    const k = Math.min(1, 1280 / Math.max(im.width, im.height)), c = document.createElement("canvas");
    c.width = Math.round(im.width * k); c.height = Math.round(im.height * k);
    const g = c.getContext("2d")!; g.fillStyle = "#FFFFFF"; g.fillRect(0, 0, c.width, c.height); g.drawImage(im, 0, 0, c.width, c.height);
    ok(c.toDataURL("image/jpeg", .86));
  };
  im.onerror = no; im.src = src;
});

export function PhotoShape({ onShape }: { onShape: (s: ShapeSpec) => void }) {
  const file = useRef<HTMLInputElement>(null);
  const [pic, setPic] = useState<string | null>(null), [note, setNote] = useState(""), [busy, setBusy] = useState(false), [msg, setMsg] = useState("");
  const [over, setOver] = useState(false);
  const take = (f?: File | null) => {
    if (!f) return;
    if (!f.type.startsWith("image/")) { setMsg("사진 파일(JPG, PNG, WEBP)을 골라 주십시오."); return; }
    const r = new FileReader();
    r.onload = async () => { try { setPic(await shrink(String(r.result))); setMsg(""); } catch { setMsg("사진을 열지 못했습니다. 다른 사진으로 해 주십시오."); } };
    r.readAsDataURL(f);
  };
  const make = async () => {
    if (!pic) { setMsg("먼저 사진을 넣어 주십시오."); return; }
    setBusy(true); setMsg("사진을 읽고 있습니다…");
    try {
      const res = await fetch("/api/shape", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ image: { mediaType: "image/jpeg", data: pic.split(",")[1] }, note }) });
      const j = await res.json().catch(() => ({}));
      const spec = res.ok ? readSpec(j.shape) : null;
      if (!spec) { setMsg(ERR[j.error as string] ?? "사진을 읽지 못했습니다. 다시 눌러 주십시오."); return; }
      onShape(spec); setMsg(spec.summary ?? "사진대로 모양을 만들었습니다.");
    } catch { setMsg("AI에 닿지 못했습니다. 인터넷을 확인하고 다시 눌러 주십시오."); }
    finally { setBusy(false); }
  };
  return (
    <div className="ph">
      <input ref={file} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={e => { take(e.target.files?.[0]); e.target.value = ""; }} />
      <button type="button" className={"ph-drop" + (pic ? " has-pic" : "") + (over ? " is-over" : "")} onClick={() => file.current?.click()}
        onDragOver={e => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)} onDrop={e => { e.preventDefault(); setOver(false); take(e.dataTransfer.files?.[0]); }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {pic ? <img src={pic} alt="넣은 사진" /> : <><b>사진 넣기</b><span>누르거나 사진을 끌어다 놓으십시오</span></>}
      </button>
      <p className="nb-help">만들고 싶은 가방이나 파우치 사진을 넣으면, AI가 모양과 색을 읽어 도안과 3D를 만듭니다. 종이에 그린 그림을 찍어도 됩니다.</p>
      <label className="ph-note"><span>메모</span><input className="nb-input" value={note} maxLength={200} autoComplete="off" onChange={e => setNote(e.target.value)} aria-describedby="ph-note-help" /></label>
      <p id="ph-note-help" className="nb-help ph-sub">크기나 색을 적으면 그대로 맞춥니다. 예: 폭 25cm, 연분홍</p>
      <div className="ph-acts">
        {pic && <button type="button" className="nb-link st-muted" onClick={() => file.current?.click()}>다른 사진</button>}
        <button type="button" className="tp-label ph-go" disabled={!pic || busy} onClick={make}><b>{busy ? "읽는 중…" : "이 사진으로 만들기"}</b></button>
      </div>
      {msg && <p className="nb-help ph-msg" role="status">{msg}</p>}
    </div>
  );
}
