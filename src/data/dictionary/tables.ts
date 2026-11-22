// 한눈에 보는 표 (뜨개 사전 · web). The frames only for now (Kim): `cols` / `rows` to come; without them the pop-up
// says "준비 중".
import type { DictTable } from "./types";

export const TABLES: DictTable[] = [
  { id: "needle-sizes", title: "바늘 호수 대조", short: "한국 호수 · mm · US · UK" },
  { id: "yarn-weights", title: "실 굵기 분류", short: "Lace부터 Super Bulky까지" },
  { id: "us-uk", title: "미국식 · 영국식 용어", short: "같은 이름, 다른 코" },
  { id: "care-symbols", title: "세탁 기호", short: "실 라벨의 그림 읽기" },
];
