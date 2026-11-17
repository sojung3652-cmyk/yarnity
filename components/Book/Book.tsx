"use client";
// The book. Uses the WebGL (React Three Fiber) book when the browser can render it, otherwise the
// original CSS 3D book. The mode and the open/closed/wizard state come from BookProvider (root layout).
import dynamic from "next/dynamic";
import { Component, type ReactNode } from "react";
import "./Book.css";
import { BookCSS } from "./BookCSS";
import { useBook } from "./BookProvider";

// three.js touches window/WebGL at import time, so it is never server-rendered.
const Book3D = dynamic(() => import("./three/Book3D"), { ssr: false, loading: () => null });

// Any runtime failure inside the 3D tree (shader compile, context creation...) drops to the CSS book.
class Fallback extends Component<{ onError: () => void; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(e: unknown) { console.warn("[Book3D] falling back to CSS book:", e); this.props.onError(); }
  render() { return this.state.failed ? null : this.props.children; }
}

export function Book() {
  const b = useBook();
  if (b.mode === "pending") return null;
  if (b.mode === "css") return <div className="book-css-slot"><BookCSS open={b.view === "home"} setOpen={v => (v ? b.open() : b.close())} /></div>;
  return (
    <Fallback onError={() => b.setMode("css")}>
      <Book3D onFail={() => b.setMode("css")} />
    </Fallback>
  );
}
