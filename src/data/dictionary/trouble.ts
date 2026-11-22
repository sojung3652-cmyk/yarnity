// 막힐 때 (뜨개 사전 · web). ~입니다체. `illustration` / `compare[].art` name drawings in components/dictionary/DictArt.tsx.
import type { Trouble } from "./types";

export const TROUBLES: Trouble[] = [
  {
    id: "cupping", title: "원이 컵처럼 말려요", craft: "crochet", cause: "늘림이 부족할 때", illustration: "cup",
    compare: [
      { art: "cup", label: "컵처럼 말림", note: "늘림이 부족", on: true },
      { art: "flat", label: "평평함", note: "알맞음" },
      { art: "wave", label: "물결침", note: "늘림이 많음" },
    ],
    why: "원은 바깥으로 갈수록 둘레가 길어집니다. 늘린 코가 둘레를 따라가지 못하면 편물이 위로 솟습니다. 손 힘이 세서 코가 작아져도 같은 일이 생깁니다.",
    fixes: ["단마다 코 수를 세어 6코씩 늘었는지 확인합니다.", "늘림 위치를 단마다 반 칸씩 엇갈리게 합니다.", "그래도 말리면 바늘을 한 호수 굵게 바꿉니다."],
  },
  { id: "ruffling", title: "원이 물결쳐요", craft: "crochet", cause: "늘림이 많을 때", illustration: "wave" },
  { id: "count-drift", title: "코 수가 자꾸 변해요", craft: "both", cause: "단 끝과 시작 코를 확인", illustration: "dots" },
  { id: "wavy-edge", title: "가장자리가 울퉁불퉁해요", craft: "crochet", cause: "기둥코와 마지막 코", illustration: "edges" },
  { id: "spiral-lean", title: "원형뜨기가 비스듬히 꼬여요", craft: "both", cause: "나선형으로 뜰 때", illustration: "lean" },
  { id: "dropped", title: "코가 빠졌어요", craft: "knit", cause: "당황하지 말고 코바늘로", illustration: "drop" },
  { id: "tension", title: "너무 빡빡하거나 헐렁해요", craft: "both", cause: "손 힘과 바늘 호수", illustration: "lines" },
  { id: "run-out", title: "실이 모자라요", craft: "both", cause: "로트 번호와 이어 붙이기", illustration: "join" },
  { id: "magic-ring", title: "매직링이 풀려요", craft: "crochet", cause: "실 끝 정리 요령", illustration: "ring" },
];
