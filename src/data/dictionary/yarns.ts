// 실 도감 (뜨개 사전 · web). ~입니다체. traits 1~5: 보온성, 신축성, 부드러움, 세탁 편함, 가격(높을수록 비쌈).
// Pictures: close-ups of knitted fabric (Kim), Unsplash License (free, commercial use, no credit needed) - sources in
// docs/credits/yarn-photos.md. They show a texture like the yarn's; the photos do not say which fibre they are.
import type { Yarn } from "./types";

export const YARN_GROUPS: { id: Yarn["group"]; label: string }[] = [
  { id: "animal", label: "동물 섬유" },
  { id: "plant", label: "식물 섬유" },
  { id: "synthetic", label: "합성 섬유" },
  { id: "special", label: "특수 실" },
];

export const YARNS: Yarn[] = [
  {
    id: "wool", image: "/dictionary/yarns/wool.jpg", name: "울", nameEn: "Wool", group: "animal", short: "따뜻하고 탄력 있음", seasons: ["autumn", "winter"],
    traits: { warmth: 5, stretch: 4, softness: 3, care: 1, price: 3 },
    about: "털 사이에 공기를 머금어 가볍고 따뜻합니다. 탄력이 좋아 늘어났다가도 제 모양으로 돌아옵니다. 메리노 울은 결이 가늘어 맨살에 닿아도 덜 따갑고, 램스울은 어린 양의 털이라 더 부드럽습니다.",
    caution: "뜨거운 물에 담그거나 비비면 털이 엉겨 줄어듭니다(펠팅). 찬물에 손세탁하고 눕혀서 말립니다. \"Superwash\" 표시가 있으면 세탁기 사용이 가능합니다.",
  },
  {
    id: "mohair", image: "/dictionary/yarns/mohair.jpg", name: "모헤어", nameEn: "Mohair", group: "animal", short: "보송보송, 가벼움", seasons: ["autumn", "winter"],
    traits: { warmth: 4, stretch: 2, softness: 4, care: 1, price: 4 },
    about: "앙고라 염소의 털로 만든 실입니다. 가는 심 실 둘레에 긴 털이 후광처럼 퍼져 있어, 굵게 뜨지 않아도 포근하고 가벼운 편물이 됩니다. 다른 실과 한 가닥씩 겹쳐 뜨면 색이 은은하게 섞이고 보송한 결이 더해집니다.",
    caution: "털이 서로 걸려 한 번 뜬 것을 풀기 어렵습니다. 코가 잘 보이지 않으니 단수링을 자주 겁니다. 피부가 예민하면 따끔할 수 있고, 울처럼 뜨거운 물과 마찰에 줄어듭니다.",
  },
  {
    id: "alpaca", image: "/dictionary/yarns/alpaca.jpg", name: "알파카", nameEn: "Alpaca", group: "animal", short: "울보다 가볍고 따뜻함", seasons: ["winter"],
    traits: { warmth: 5, stretch: 2, softness: 5, care: 1, price: 4 },
    about: "남미 알파카의 털입니다. 섬유 속이 비어 있어 같은 굵기의 울보다 가볍고 따뜻하며, 라놀린(양털 기름)이 없어 털 알레르기가 있는 사람도 비교적 편하게 씁니다. 결이 매끄럽고 은은한 광택이 있습니다.",
    caution: "탄력이 적어 무게 때문에 아래로 처지기 쉽습니다. 큰 옷은 게이지를 조금 촘촘하게 잡거나 울과 섞인 실을 고릅니다. 찬물 손세탁 후 눕혀 말립니다.",
  },
  {
    id: "cotton", image: "/dictionary/yarns/cotton.jpg", name: "면", nameEn: "Cotton", group: "plant", short: "시원하고 세탁이 쉬움", seasons: ["spring", "summer"],
    traits: { warmth: 2, stretch: 1, softness: 4, care: 4, price: 2 },
    about: "목화에서 얻은 식물 섬유입니다. 땀을 잘 흡수하고 통기가 좋아 여름옷, 아기 옷, 수세미, 행주에 많이 씁니다. 코의 모양이 또렷하게 드러나 무늬뜨기나 인형에도 잘 어울립니다.",
    caution: "탄력이 거의 없어 손이 빡빡하면 손목이 아프고, 무거운 편물은 늘어질 수 있습니다. 머서라이즈드(실켓) 면은 광택이 있고 보풀이 덜 생깁니다. 세탁기 사용이 가능한 경우가 많지만 건조기는 줄어들 수 있습니다.",
  },
  {
    id: "linen", image: "/dictionary/yarns/linen.jpg", name: "린넨", nameEn: "Linen", group: "plant", short: "빨수록 부드러워짐", seasons: ["summer"],
    traits: { warmth: 1, stretch: 1, softness: 2, care: 4, price: 4 },
    about: "아마 줄기에서 얻은 섬유입니다. 처음에는 뻣뻣하지만 빨수록 부드러워지고 광택이 살아납니다. 바람이 잘 통하고 금방 말라서 여름 숄, 가방, 행주에 좋습니다.",
    caution: "신축성이 없어 손에 힘이 들어가기 쉽고, 코가 고르지 않게 보이기도 합니다. 뜨고 나서 물에 적셔 블로킹하면 코가 가지런해집니다. 구김이 잘 가는 것도 린넨의 성격입니다.",
  },
  {
    id: "acrylic", image: "/dictionary/yarns/acrylic.jpg", name: "아크릴", nameEn: "Acrylic", group: "synthetic", short: "저렴하고 관리가 쉬움", seasons: ["spring", "summer", "autumn", "winter"],
    traits: { warmth: 3, stretch: 3, softness: 3, care: 5, price: 1 },
    about: "석유에서 만든 합성 섬유로 울과 비슷한 촉감을 냅니다. 값이 싸고 색이 다양하며, 세탁기에 빨아도 줄어들지 않아 연습용, 담요, 인형, 수세미실로 많이 씁니다.",
    caution: "열에 약해 다리미를 직접 대면 녹거나 광택이 죽습니다(스팀은 띄워서). 보풀과 정전기가 생기기 쉽고, 울만큼 숨을 쉬지 못해 오래 입으면 덥게 느껴질 수 있습니다.",
  },
  {
    id: "cord", image: "/dictionary/yarns/cord.jpg", name: "코드사", nameEn: "Cord yarn", group: "synthetic", short: "끈처럼 짜인 실, 가방용", seasons: ["spring", "summer"],
    traits: { warmth: 1, stretch: 1, softness: 2, care: 4, price: 2 },
    about: "가는 실을 끈처럼 짜서 속이 빈 관 모양으로 만든 실입니다. 대부분 폴리에스터라 가볍고 질기며, 힘 있게 각이 잡혀 가방, 바구니, 파우치에 많이 씁니다.",
    caution: "미끄러워 코가 쉽게 늘어지니 실 권장보다 가는 코바늘로 촘촘하게 뜹니다. 실 끝이 잘 풀리므로 라이터로 살짝 지지거나 실 끝을 단단히 숨깁니다.",
  },
  {
    id: "boucle", image: "/dictionary/yarns/boucle.jpg", name: "부클레", nameEn: "Bouclé", group: "special", short: "고리가 동글동글 맺힌 실", seasons: ["autumn", "winter"],
    traits: { warmth: 4, stretch: 2, softness: 4, care: 2, price: 3 },
    about: "실을 꼴 때 한 가닥을 느슨하게 넣어 작은 고리가 송글송글 맺히게 만든 실입니다. 단순한 뜨기만으로도 양털 같은 입체감이 나서 겉옷, 쿠션, 인형에 잘 어울립니다.",
    caution: "고리 때문에 코가 잘 보이지 않고 바늘이 고리에 걸리기 쉬워 첫 작품에는 어렵습니다. 끝이 둥근 바늘을 쓰고, 코 수를 자주 셉니다. 한 번 뜬 것을 풀기도 어렵습니다.",
  },
];
