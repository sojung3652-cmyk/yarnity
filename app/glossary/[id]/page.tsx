"use client";
// 뜨개 용어집, one term: its own page on phones; on wide screens the list with this term in the panel.
import { useParams } from "next/navigation";
import { GlossaryScreen } from "@/components/glossary/Glossary";

export default function GlossaryTermPage() {
  const { id } = useParams<{ id: string }>();
  return <GlossaryScreen id={id} />;
}
