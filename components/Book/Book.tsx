"use client";
// Home-page book. Uses the WebGL (React Three Fiber) book when the browser can render it,
// otherwise the original CSS 3D book. Both share the same open/close state and button.
import dynamic from "next/dynamic";
import { Component, useEffect, useState, type ReactNode } from "react";
import "./Book.css";
import { BookCSS } from "./BookCSS";
import { OpenButton } from "./OpenButton";
import { useBookState, type BookState } from "./useBookState";

// three.js touches window/WebGL at import time, so it is never server-rendered.
const Book3D = dynamic(() => import("./three/Book3D"), { ssr: false, loading: () => null });

function hasWebGL() {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch { return false; }
}

// Any runtime failure inside the 3D tree (shader compile, context creation...) drops to the CSS book.
class Fallback extends Component<{ onError: () => void; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(e: unknown) { console.warn("[Book3D] falling back to CSS book:", e); this.props.onError(); }
  render() { return this.state.failed ? null : this.props.children; }
}

/** Empty stage of the same size, shown until we know which book to render (no layout shift). */
function Placeholder({ state }: { state: BookState }) {
  return (
    <section className="bookstage" aria-label="소개">
      <div className="stage3d" aria-hidden="true" />
      <OpenButton open={state.open} onToggle={state.toggle} />
    </section>
  );
}

export function Book() {
  const state = useBookState();
  const [mode, setMode] = useState<"pending" | "3d" | "css">("pending");
  useEffect(() => {
    const forced = new URLSearchParams(location.search).get("book"); // ?book=css to compare
    setMode(forced === "css" || !hasWebGL() ? "css" : "3d");
  }, []);

  if (mode === "css") return <BookCSS {...state} />;
  if (mode === "pending") return <Placeholder state={state} />;
  return (
    <Fallback onError={() => setMode("css")}>
      <Book3D {...state} onFail={() => setMode("css")} />
    </Fallback>
  );
}
