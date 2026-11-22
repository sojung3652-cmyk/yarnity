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
    id: "boucle", image: "/dictionary/yarns/boucle.jpg", name: "부클레", nameEn: "Bouclé", group: "special", short: "고리가 동글동글 맺힌 실", seasons: ["autumn", "winter"],
    traits: { warmth: 4, stretch: 2, softness: 4, care: 2, price: 3 },
    about: "실을 꼴 때 한 가닥을 느슨하게 넣어 작은 고리가 송글송글 맺히게 만든 실입니다. 단순한 뜨기만으로도 양털 같은 입체감이 나서 겉옷, 쿠션, 인형에 잘 어울립니다.",
    caution: "고리 때문에 코가 잘 보이지 않고 바늘이 고리에 걸리기 쉬워 첫 작품에는 어렵습니다. 끝이 둥근 바늘을 쓰고, 코 수를 자주 셉니다. 한 번 뜬 것을 풀기도 어렵습니다.",
  },
  {
    id: "silk", image: "/dictionary/yarns/silk.jpg", name: "실크", nameEn: "Silk", group: "animal", short: "은은한 광택, 매끄러움", seasons: ["spring", "autumn"],
    traits: { warmth: 3, stretch: 1, softness: 5, care: 1, price: 5 },
    about: "누에고치에서 뽑은 단백질 섬유입니다. 은은한 광택이 있고 매끄러우며, 편물이 부드럽게 흘러내리듯 떨어집니다. 가볍지만 생각보다 따뜻해서 숄이나 여름 카디건, 울과 섞은 실로 많이 씁니다.",
    caution: "탄력이 거의 없어 편물이 길이 방향으로 늘어나기 쉽습니다. 미끄러워 실 끝이 잘 풀리니 길게 숨기고, 찬물에 중성세제로 손세탁한 뒤 그늘에 눕혀 말립니다.",
  },
  {
    id: "cashmere", image: "/dictionary/yarns/cashmere.jpg", name: "캐시미어", nameEn: "Cashmere", group: "animal", short: "가장 부드럽고 가벼운 털", seasons: ["autumn", "winter"],
    traits: { warmth: 5, stretch: 3, softness: 5, care: 1, price: 5 },
    about: "캐시미어 염소의 가는 속털로 만든 실입니다. 울보다 훨씬 가늘고 부드러워 맨살에 닿아도 따갑지 않고, 가볍고 따뜻합니다. 목도리, 모자, 장갑처럼 피부에 직접 닿는 작은 작품에 잘 어울립니다.",
    caution: "값이 비싸고 마찰에 약해 보풀이 잘 생깁니다. 울처럼 뜨거운 물과 비비기에 줄어들 수 있으니 찬물에 살살 손세탁하고 눕혀 말립니다.",
  },
  {
    id: "nylon", image: "/dictionary/yarns/nylon.jpg", name: "나일론", nameEn: "Nylon", group: "synthetic", short: "질기고 닳지 않음", seasons: ["spring", "summer", "autumn", "winter"],
    traits: { warmth: 2, stretch: 4, softness: 3, care: 5, price: 2 },
    about: "아주 질기고 잘 닳지 않는 합성 섬유입니다. 단독으로보다는 울에 20~25%쯤 섞어 양말실로 많이 쓰고, 신축성이 좋아 모양이 잘 돌아옵니다. 광택 있는 끈실로도 만들어집니다.",
    caution: "열에 약해 다리미를 직접 대면 녹을 수 있습니다. 땀을 잘 흡수하지 못해 100% 나일론 옷은 덥고 답답할 수 있습니다.",
  },
  {
    id: "polyester", image: "/dictionary/yarns/polyester.jpg", name: "폴리에스터", nameEn: "Polyester", group: "synthetic", short: "가볍고 형태가 잘 유지됨", seasons: ["spring", "summer", "autumn", "winter"],
    traits: { warmth: 2, stretch: 2, softness: 3, care: 5, price: 1 },
    about: "가장 흔한 합성 섬유로 가볍고 질기며 구김이 잘 가지 않습니다. 물을 머금지 않아 빨리 마르고, 형태가 잘 유지되어 가방실, 수세미실 등 여러 실의 재료가 됩니다. 재활용 페트병으로 만든 폴리에스터 실도 있습니다.",
    caution: "열에 약해 높은 온도의 다리미나 건조기는 피합니다. 정전기가 잘 생기고, 땀을 흡수하지 못해 옷으로 입으면 덥게 느껴질 수 있습니다.",
  },
  {
    id: "bamboo", image: "/dictionary/yarns/bamboo.jpg", name: "대나무", nameEn: "Bamboo (viscose)", group: "plant", short: "시원하고 실크처럼 매끄러움", seasons: ["spring", "summer"],
    traits: { warmth: 1, stretch: 1, softness: 5, care: 3, price: 3 },
    about: "대나무 펄프를 녹여 다시 뽑은 재생 섬유(비스코스, 레이온)입니다. 매끄럽고 시원하며 실크처럼 은은한 광택이 있어 여름 상의, 아기 옷, 숄에 잘 어울립니다. 면과 섞은 실도 많습니다.",
    caution: "물에 젖으면 약해지고 무거워져 편물이 늘어나기 쉽습니다. 비틀어 짜지 말고 눌러 물기를 뺀 뒤 눕혀 말립니다.",
  },
  {
    id: "nalgae", image: "/dictionary/yarns/nalgae.jpg", name: "날개사", nameEn: "Brushed scrubber yarn", group: "synthetic", short: "잔털이 많은 수세미실", seasons: ["spring", "summer", "autumn", "winter"],
    traits: { warmth: 2, stretch: 2, softness: 2, care: 5, price: 1 },
    about: "아크릴 같은 합성 섬유에 잔털이 날개처럼 붙어 있는 실입니다. 까슬까슬한 잔털이 거품을 잘 내고 때를 잘 닦아 주로 수세미를 뜰 때 씁니다. 반짝이는 펄이 섞인 것도 있고, '솔잎사'라고도 부릅니다.",
    caution: "털 때문에 코가 잘 보이지 않아 처음 뜨는 사람에게는 어렵습니다. 단수링을 자주 걸고, 한 번 뜬 것을 풀면 털이 엉키니 천천히 풉니다.",
  },
  {
    id: "mink", image: "/dictionary/yarns/mink.jpg", name: "밍크사", nameEn: "Faux mink yarn", group: "synthetic", short: "털이 길고 보드라움", seasons: ["autumn", "winter"],
    traits: { warmth: 4, stretch: 2, softness: 5, care: 3, price: 2 },
    about: "아크릴이나 폴리에스터로 밍크 털처럼 보드랍게 만든 실입니다. 털이 길고 풍성해 단순한 짧은뜨기만으로도 포근한 편물이 되어 목도리, 모자, 인형, 쿠션에 많이 씁니다.",
    caution: "털이 날리고 코가 거의 보이지 않아 코 수를 세기 어렵습니다. 뜨는 동안 털이 많이 날리니 옷에 붙지 않게 하고, 세탁망에 넣어 약하게 빱니다.",
  },
  {
    id: "chenille", image: "/dictionary/yarns/chenille.jpg", name: "셔닐 · 벨벳사", nameEn: "Chenille", group: "special", short: "벨벳처럼 도톰하고 부드러움", seasons: ["autumn", "winter"],
    traits: { warmth: 4, stretch: 2, softness: 5, care: 3, price: 2 },
    about: "가는 심 실에 짧은 털을 촘촘히 박아 벨벳처럼 만든 실입니다. 도톰하고 부드러워 담요, 인형, 아기 이불처럼 포근해야 하는 작품에 잘 어울립니다. '벨벳사'라고도 부릅니다.",
    caution: "코를 너무 느슨하게 뜨면 털 실이 빠져나와 고리가 생기기 쉽습니다(웜잉). 조금 촘촘하게 뜨고, 실 끝은 매듭을 지어 단단히 정리합니다.",
  },
  {
    id: "fabric", image: "/dictionary/yarns/fabric.jpg", name: "패브릭얀", nameEn: "T-shirt yarn", group: "special", short: "원단을 잘라 만든 넓은 실", seasons: ["spring", "summer", "autumn", "winter"],
    traits: { warmth: 2, stretch: 3, softness: 3, care: 4, price: 2 },
    about: "티셔츠 같은 저지 원단을 길게 잘라 만든 넓고 납작한 실입니다. 아주 굵어서 8~12mm 바늘로 금방 뜰 수 있고, 힘이 있어 바구니, 러그, 가방, 컵받침에 많이 씁니다. 의류를 만들고 남은 원단을 재활용한 경우가 많습니다.",
    caution: "타래마다 굵기와 신축성이 조금씩 달라 한 작품에는 같은 타래를 쓰는 것이 좋습니다. 손에 힘이 많이 들어가므로 오래 뜰 때는 쉬어 가며 뜹니다.",
  },
  {
    id: "raffia", image: "/dictionary/yarns/raffia.jpg", name: "라피아", nameEn: "Raffia", group: "plant", short: "여름 모자와 가방용", seasons: ["summer"],
    traits: { warmth: 1, stretch: 1, softness: 1, care: 2, price: 3 },
    about: "라피아 야자 잎에서 얻은 섬유, 또는 그것처럼 보이게 만든 종이·레이온 실입니다. 가볍고 빳빳해 형태가 잘 잡히고, 밀짚 같은 느낌이 나서 여름 모자, 가방, 바구니에 잘 어울립니다.",
    caution: "꺾이면 자국이 남고, 종이 라피아는 물에 약합니다. 물세탁보다는 마른 솔로 털어 관리하고, 찌그러지면 스팀을 살짝 쐬어 모양을 잡습니다.",
  },
  {
    id: "merino", image: "/dictionary/yarns/merino.jpg", name: "메리노 울", nameEn: "Merino wool", group: "animal", short: "가늘고 부드러운 울", seasons: ["autumn", "winter"],
    traits: { warmth: 5, stretch: 4, softness: 4, care: 2, price: 4 },
    about: "메리노 양의 털로 만든 울입니다. 털 한 올이 아주 가늘어 일반 울보다 훨씬 부드럽고 덜 따가워 목도리나 아기 옷처럼 피부에 닿는 작품에 많이 씁니다. 탄력이 좋아 코가 고르게 나옵니다.",
    caution: "울이라 뜨거운 물과 마찰에 줄어듭니다. 'Superwash' 표시가 없으면 찬물에 손세탁하고 눕혀 말립니다. 보풀이 생기기 쉬우니 보풀 제거기로 가볍게 정리합니다.",
  },
  {
    id: "angora", image: "/dictionary/yarns/angora.jpg", name: "앙고라", nameEn: "Angora", group: "animal", short: "토끼털, 가볍고 아주 포근함", seasons: ["winter"],
    traits: { warmth: 5, stretch: 2, softness: 5, care: 1, price: 5 },
    about: "앙고라 토끼의 털로 만든 실입니다. 털이 아주 가늘고 속이 비어 있어 가볍고 무척 따뜻하며, 겉에 보송한 털이 피어오릅니다. 보통 울이나 나일론과 섞어 씁니다. 앙고라 염소의 털은 '모헤어'라고 부르니 헷갈리지 않게 합니다.",
    caution: "털이 잘 빠지고 날립니다. 마찰과 뜨거운 물에 쉽게 펠팅되니 찬물에 살짝 눌러 빨고, 보관할 때는 접어서 서랍에 넣습니다.",
  },
  {
    id: "tencel", image: "/dictionary/yarns/tencel.jpg", name: "텐셀", nameEn: "Tencel (lyocell)", group: "plant", short: "매끄럽고 찰랑임", seasons: ["spring", "summer"],
    traits: { warmth: 1, stretch: 1, softness: 5, care: 3, price: 3 },
    about: "유칼립투스 같은 나무 펄프를 녹여 다시 뽑은 재생 섬유(라이오셀)입니다. 매끄럽고 찰랑거리며 은은한 광택이 있고, 땀을 잘 흡수해 여름 상의나 숄에 잘 어울립니다.",
    caution: "탄력이 없어 무게 때문에 편물이 늘어나기 쉽습니다. 물에 젖으면 약해지니 비틀어 짜지 말고, 눌러 물기를 뺀 뒤 눕혀 말립니다.",
  },
  {
    id: "hemp", image: "/dictionary/yarns/hemp.jpg", name: "헴프", nameEn: "Hemp", group: "plant", short: "질기고 빳빳함, 빨수록 부드러움", seasons: ["summer"],
    traits: { warmth: 1, stretch: 1, softness: 1, care: 4, price: 3 },
    about: "대마 줄기에서 얻은 섬유입니다. 린넨보다 더 질기고 거칠지만, 빨수록 부드러워지고 광택이 살아납니다. 튼튼해서 시장바구니, 그물가방, 행주에 잘 어울립니다.",
    caution: "신축성이 없어 손에 힘이 많이 들어갑니다. 처음에는 뻣뻣하니 뜨고 나서 물에 적셔 블로킹하면 코가 가지런해집니다.",
  },
  {
    id: "jute", image: "/dictionary/yarns/jute.jpg", name: "황마", nameEn: "Jute", group: "plant", short: "거칠고 자연스러운 끈", seasons: ["spring", "summer"],
    traits: { warmth: 1, stretch: 1, softness: 1, care: 2, price: 1 },
    about: "황마 줄기에서 얻은 거칠고 빳빳한 자연 섬유로, 마대나 노끈으로 익숙한 실입니다. 형태가 잘 잡혀 바구니, 러그, 화분 커버처럼 자연스러운 느낌의 소품에 씁니다.",
    caution: "섬유 가루가 날리고 손이 거칠어질 수 있습니다. 물에 약해 곰팡이가 생기기 쉬우니 젖지 않게 두고, 더러워지면 마른 솔로 털어 냅니다.",
  },

  {
    id: "poodle", image: "/dictionary/yarns/poodle.jpg", name: "푸들사", nameEn: "Poodle yarn", group: "special", short: "푸들 털처럼 곱슬곱슬", seasons: ["autumn", "winter"],
    traits: { warmth: 4, stretch: 2, softness: 4, care: 3, price: 2 },
    about: "작은 고리가 촘촘히 뭉쳐 푸들 털처럼 곱슬곱슬한 실입니다. 부클레보다 고리가 더 작고 빽빽해서, 짧은뜨기만 해도 양털 인형 같은 결이 나옵니다. 곰 인형, 모자, 가방, 쿠션에 많이 씁니다.",
    caution: "고리 때문에 코가 거의 보이지 않아 코 수를 세기 어렵습니다. 단수링을 자주 걸고, 한 번 뜬 것을 풀면 고리가 엉키니 천천히 풉니다.",
  },
  {
    id: "scrubber", image: "/dictionary/yarns/scrubber.jpg", name: "수세미실", nameEn: "Acrylic scrubber yarn", group: "synthetic", short: "세제 없이도 잘 닦임", seasons: ["spring", "summer", "autumn", "winter"],
    traits: { warmth: 1, stretch: 2, softness: 2, care: 5, price: 1 },
    about: "아크릴로 만든 수세미 전용 실입니다. 아크릴 섬유가 기름때를 잘 잡아 세제를 적게 써도 설거지가 잘 되고, 물이 금방 빠져 빨리 마릅니다. 색이 다양하고 값이 싸서 첫 작품으로 많이 뜹니다.",
    caution: "열에 약해 뜨거운 물에 삶으면 줄거나 뻣뻣해집니다. 쓰고 나서 물기를 짜 잘 말리고, 낡으면 새로 뜹니다.",
  },

  {
    id: "metal", image: "/dictionary/yarns/metal.jpg", name: "메탈사", nameEn: "Metallic tape yarn", group: "special", short: "통째로 반짝이는 테이프 실", seasons: ["spring", "summer", "autumn", "winter"],
    traits: { warmth: 1, stretch: 1, softness: 1, care: 2, price: 3 },
    about: "금속 광택 필름을 납작한 테이프나 가는 끈 모양으로 만든 실로, 다른 실에 섞지 않고 이 실만으로 뜹니다. 편물 전체가 금속처럼 빛나 요즘 미니 가방, 파우치, 버킷햇, 여름 탑에 많이 쓰입니다. 짧은뜨기로 촘촘히 뜨면 모양이 단단하게 잡힙니다.",
    caution: "잘 미끄러지고 꼬이기 쉬우니 실타래를 풀어 가며 천천히 뜹니다. 필름이 접히면 자국이 남고 열에 약해 다림질과 건조기를 피하고, 손으로 가볍게 닦아 관리합니다. 실 끝은 매듭 대신 여러 번 엮어 숨깁니다.",
  },

  {
    id: "loop", image: "/dictionary/yarns/loop.jpg", name: "루프얀", nameEn: "Loop yarn", group: "special", short: "바늘 없이 손으로 뜨는 실", seasons: ["autumn", "winter"],
    traits: { warmth: 4, stretch: 2, softness: 4, care: 3, price: 2 },
    about: "실 자체에 고리가 미리 만들어져 있는 아주 굵은 실입니다. 고리를 다른 고리 사이로 끼워 넣기만 하면 되어 바늘이 필요 없고, 짧은 시간에 담요나 쿠션을 만들 수 있어 아이와 함께 뜨기에도 좋습니다.",
    caution: "무늬를 다양하게 넣기 어렵고, 편물이 두꺼워 무겁습니다. 고리를 하나 빠뜨리면 구멍이 생기니 줄마다 고리 수를 확인합니다.",
  },

  {
    id: "tweed", image: "/dictionary/yarns/tweed.jpg", name: "트위드사", nameEn: "Tweed yarn", group: "special", short: "알록달록한 점이 박힌 울", seasons: ["autumn", "winter"],
    traits: { warmth: 4, stretch: 3, softness: 2, care: 2, price: 3 },
    about: "울 바탕에 다른 색 섬유 알갱이(넵)가 점점이 박힌 실입니다. 단색으로 떠도 자연스러운 색감이 살아나 빈티지한 스웨터, 모자, 목도리에 잘 어울립니다.",
    caution: "털이 조금 거칠어 맨살에 닿으면 따끔할 수 있습니다. 울이라 뜨거운 물과 마찰에 줄어드니 찬물에 손세탁합니다.",
  },
];
