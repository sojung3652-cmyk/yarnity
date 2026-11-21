"use client";
// A quiet line under a step's title: a small gold star, the words, "→", a dotted underline - no box. It
// opens the AI sheet with the question in its box (the user sends it). Words: lib/aiPrompts.ts.
import { useApp } from "@/components/AppProvider";
import { AI_LINES, type AiLineKey } from "@/lib/aiPrompts";

export function AskAiLine({ which }: { which: AiLineKey }) {
  const { setChat } = useApp();
  const { text, prompt } = AI_LINES[which];
  return (
    <button type="button" className="ask-line" onClick={() => setChat(c => ({ ...c, open: true, prefill: prompt }))}>
      <svg className="ask-star" viewBox="0 0 12 12" aria-hidden="true">
        <defs><linearGradient id={`asg-${which}`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#927238" /><stop offset=".45" stopColor="#C4A15B" /><stop offset=".7" stopColor="#EDDCA6" /><stop offset="1" stopColor="#AF8947" /></linearGradient></defs>
        <path d="M6 .5 7.1 4.9 11.5 6 7.1 7.1 6 11.5 4.9 7.1.5 6 4.9 4.9Z" fill={`url(#asg-${which})`} />
      </svg>
      <span className="ask-text">{text}</span>
      <span className="ask-arrow" aria-hidden="true">→</span>
    </button>
  );
}
