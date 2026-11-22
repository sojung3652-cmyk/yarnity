// 뜨개 상식 (뜨개 사전 · web). ~입니다체. Add an article here and it shows under its topic, in `order`.
import type { Knowhow, KnowhowTopic } from "./types";

export const KNOWHOW_TOPICS: { id: KnowhowTopic; label: string }[] = [
  { id: "kinds", label: "뜨개의 종류" },
  { id: "tools", label: "바늘 · 도구" },
  { id: "gauge", label: "게이지와 크기" },
  { id: "reading", label: "도안 읽기" },
  { id: "finishing", label: "마무리와 관리" },
];

export const KNOWHOW: Knowhow[] = [
  {
    id: "knit-vs-crochet", topic: "kinds", order: 1, title: "대바늘과 코바늘",
    summary: "같은 실로 떠도 바늘에 따라 전혀 다른 편물이 나옵니다.",
    sections: [
      { heading: "대바늘 · Knitting", body: "바늘 두 개에 코를 여러 개 걸어 두고, 고리를 이어 가며 뜹니다. 고리가 서로 이어진 구조라 **잘 늘어나고 부드러운 편물**이 나옵니다. 그래서 몸에 감기고 따뜻해야 하는 스웨터, 목도리, 양말, 모자에 많이 쓰입니다." },
      { heading: "코바늘 · Crochet", body: "끝이 갈고리인 바늘 하나로 한 코씩 매듭짓듯 뜹니다. 코가 단단히 맞물려 **힘 있고 모양이 잘 잡히는 편물**이 나옵니다. 그래서 형태가 유지되어야 하는 가방, 바구니, 인형, 수세미에 많이 쓰입니다." },
    ],
    table: {
      cols: ["대바늘", "코바늘"],
      rows: [
        ["편물", "신축성 좋음 · 부드러움", "단단함 · 힘 있음"],
        ["잘 맞는 것", "옷 · 목도리 · 양말", "가방 · 인형 · 소품"],
        ["실 사용량", "적은 편", "많은 편"],
        ["실수했을 때", "코가 빠지면 풀려 내려감", "고리 하나만 풀면 됨"],
      ],
    },
  },
  { id: "tunisian", topic: "kinds", order: 2, title: "튀니지안(아프간) 뜨기", summary: "코바늘로 대바늘처럼 코를 걸어 두고 뜹니다.", sections: [] },
  { id: "hand-vs-machine", topic: "kinds", order: 3, title: "손뜨개와 기계 니트", summary: "같은 니트라도 만드는 방법에 따라 결이 다릅니다.", sections: [] },
  { id: "finger-loop", topic: "kinds", order: 4, title: "손가락 뜨기와 루프얀", summary: "바늘 없이 손으로 뜨는 방법입니다.", sections: [] },
  { id: "where-to-start", topic: "kinds", order: 5, title: "처음엔 무엇부터 시작할까", summary: "첫 작품을 고르는 요령입니다.", sections: [] },
];

export const knowhowOf = (topic: KnowhowTopic) => KNOWHOW.filter(k => k.topic === topic).sort((a, b) => a.order - b.order);
