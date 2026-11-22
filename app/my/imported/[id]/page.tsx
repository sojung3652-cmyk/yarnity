"use client";
// 가져온 도안 · 보면서 따라 뜨기 (web, Kim: S_D): components/my/ImportedViewer.tsx.
import { useParams } from "next/navigation";
import { ImportedViewer } from "@/components/my/ImportedViewer";

export default function Page() {
  const { id } = useParams<{ id: string }>();
  return <ImportedViewer id={id} />;
}
