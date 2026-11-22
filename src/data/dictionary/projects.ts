// 작품별 가이드 (뜨개 사전 · web). ~입니다체. `more` is the pop-up's text (none yet: "준비 중").
import type { ProjectGuide } from "./types";

export const PROJECTS: ProjectGuide[] = [
  { id: "bag", name: "가방", craft: "crochet", level: "보통", yarns: "면 · 코드사 · 라피아", tip: "촘촘히, 실 권장보다 가는 바늘", icon: "bag", hook: "실 권장보다 0.5mm 가는 코바늘" },
  { id: "scarf", name: "목도리", craft: "knit", level: "쉬움", yarns: "울 · 알파카 · 모헤어", tip: "고무뜨기 · 가터뜨기", icon: "scarf" },
  { id: "hat", name: "모자", craft: "knit", level: "보통", yarns: "울", tip: "줄바늘로 원형뜨기", icon: "hat" },
  { id: "doll", name: "인형", craft: "crochet", level: "보통", yarns: "면 · 아크릴", tip: "솜이 안 보이게 촘촘히", icon: "doll" },
  { id: "scrubber", name: "수세미", craft: "crochet", level: "쉬움", yarns: "아크릴 수세미실", tip: "첫 작품으로 좋음", icon: "scrubber", firstProject: true },
  { id: "socks", name: "양말", craft: "knit", level: "어려움", yarns: "울 + 나일론 양말실", tip: "장갑바늘 · 줄바늘", icon: "sock" },
  { id: "coaster", name: "코스터", craft: "crochet", level: "쉬움", yarns: "면", tip: "원형 · 사각 연습용", icon: "coaster" },
  { id: "blanket", name: "담요", craft: "crochet", level: "보통", yarns: "아크릴 · 울", tip: "그래니 스퀘어 잇기", icon: "blanket" },
];
