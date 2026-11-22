// 실 도감 (뜨개 사전 · web). ~입니다체. Entries without traits / about show "준비 중" in their pop-up.
import type { Yarn } from "./types";

export const YARN_GROUPS: { id: Yarn["group"]; label: string }[] = [
  { id: "animal", label: "동물 섬유" },
  { id: "plant", label: "식물 섬유" },
  { id: "synthetic", label: "합성 섬유" },
  { id: "special", label: "특수 실" },
];

export const YARNS: Yarn[] = [
  {
    id: "wool", name: "울", nameEn: "Wool", group: "animal", short: "따뜻하고 탄력 있음", seasons: ["autumn", "winter"],
    traits: { warmth: 5, stretch: 4, softness: 3, care: 1, price: 3 },
    about: "털 사이에 공기를 머금어 가볍고 따뜻합니다. 탄력이 좋아 늘어났다가도 제 모양으로 돌아옵니다. 메리노 울은 결이 가늘어 맨살에 닿아도 덜 따갑고, 램스울은 어린 양의 털이라 더 부드럽습니다.",
    caution: "뜨거운 물에 담그거나 비비면 털이 엉겨 줄어듭니다(펠팅). 찬물에 손세탁하고 눕혀서 말립니다. \"Superwash\" 표시가 있으면 세탁기 사용이 가능합니다.",
  },
  { id: "mohair", name: "모헤어", nameEn: "Mohair", group: "animal", short: "보송보송, 가벼움", seasons: ["autumn", "winter"] },
  { id: "alpaca", name: "알파카", nameEn: "Alpaca", group: "animal", short: "울보다 가볍고 따뜻함", seasons: ["winter"] },
  { id: "cotton", name: "면", nameEn: "Cotton", group: "plant", short: "시원하고 세탁이 쉬움", seasons: ["spring", "summer"] },
  { id: "linen", name: "린넨", nameEn: "Linen", group: "plant", short: "빨수록 부드러워짐", seasons: ["summer"] },
  { id: "acrylic", name: "아크릴", nameEn: "Acrylic", group: "synthetic", short: "저렴하고 관리가 쉬움", seasons: ["spring", "summer", "autumn", "winter"] },
  { id: "cord", name: "코드사", nameEn: "Cord yarn", group: "synthetic", short: "끈처럼 짜인 실, 가방용", seasons: ["spring", "summer"] },
  { id: "boucle", name: "부클레", nameEn: "Bouclé", group: "special", short: "고리가 동글동글 맺힌 실", seasons: ["autumn", "winter"] },
];
