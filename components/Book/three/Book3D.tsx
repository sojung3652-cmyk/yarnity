"use client";
import { Canvas } from "@react-three/fiber";
import { useState } from "react";
import { OpenButton } from "../OpenButton";
import type { BookState } from "../useBookState";

export default function Book3D({ open, toggle }: BookState & { onFail: () => void }) {
  const [ready, setReady] = useState(false);
  return (
    <section className="bookstage" aria-label="소개">
      <div className={"stage3d" + (ready ? " ready" : "")} id="book">
        <Canvas dpr={[1, 2]} gl={{ alpha: true, antialias: true }} camera={{ position: [0, 40, 80], fov: 22 }} onCreated={() => setReady(true)}>
          <ambientLight intensity={1} />
          <mesh><boxGeometry args={[15, 3.5, 20]} /><meshStandardMaterial color="#B29CD9" /></mesh>
        </Canvas>
      </div>
      <OpenButton open={open} onToggle={toggle} />
    </section>
  );
}
