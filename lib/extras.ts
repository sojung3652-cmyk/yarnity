// 단추와 라벨 (Kim's own pictures, public/extras): the ones to put on a piece in the 3D (달아 보기). Each is a
// picture cut to its edge on a clear background; `r` is its width against its height, `cm` its usual width.
export type ExtraPic = { id: string; name: string; r: number; cm: number };

const pic = (id: string, name: string, w: number, h: number, cm: number): ExtraPic => ({ id, name, r: w / h, cm });

export const BUTTONS: ExtraPic[] = [
  pic("b-wood-4hole", "원목 네 구멍", 314, 320, 2),
  pic("b-walnut-flower", "호두나무 꽃", 320, 313, 2),
  pic("b-birch-bunny", "자작나무 토끼", 180, 320, 1.3),
  pic("b-mint-flower", "민트 꽃", 320, 306, 2),
  pic("b-pink-star", "핑크 별", 320, 314, 1.8),
  pic("b-yellow-daisy", "노랑 데이지", 304, 320, 2),
  pic("b-pearl-gold", "진주 금테", 316, 320, 1.8),
  pic("b-pearl-blossom", "진주 벚꽃", 320, 307, 2),
  pic("b-pearl-clover", "자개 네잎클로버", 320, 315, 2),
];

export const LABEL_GROUPS: [string, ExtraPic[]][] = [
  ["원단", [
    pic("f-rose-bow", "장미 리본", 369, 184, 5), pic("f-blue-bird", "파랑새", 363, 185, 5), pic("f-floral-wreath", "꽃 화환", 373, 186, 5),
    pic("f-red-stripe", "빨간 줄", 361, 180, 5), pic("f-strawberry", "딸기", 375, 185, 5), pic("f-bunny-gingham", "토끼 깅엄", 370, 187, 5),
    pic("f-daisy", "데이지", 362, 187, 5), pic("f-cat", "고양이", 368, 187, 5), pic("f-lavender", "라벤더", 373, 181, 5),
    pic("f-pink-bow", "분홍 리본", 364, 182, 5), pic("f-blue-flowers", "파란 꽃", 361, 181, 5), pic("f-songbird", "작은 새", 371, 179, 5),
    pic("f-yarn-ball", "실뭉치", 374, 171, 5), pic("f-yarn-heart", "실 하트", 365, 170, 5), pic("f-made-with-love", "Made with Love", 367, 168, 5),
    pic("f-sleeping-cat", "잠자는 고양이", 370, 168, 5), pic("f-moon-stars", "달과 별", 374, 173, 5), pic("f-one-of-a-kind", "One of a Kind", 363, 173, 5),
    pic("f-yellow-wreath", "노란 화환", 358, 177, 5), pic("f-lavender-bow", "보라 리본", 374, 174, 5),
  ]],
  ["가죽", [pic("l-black", "검정", 409, 170, 4), pic("l-camel", "카멜", 403, 170, 4), pic("l-chocolate", "초콜릿", 405, 170, 4), pic("l-dusty-rose", "더스티 로즈", 406, 170, 4), pic("l-ivory", "아이보리", 408, 171, 4)]],
  ["금속", [pic("m-brass", "앤티크 브라스", 480, 177, 4.5), pic("m-gold", "금색", 480, 177, 4.5), pic("m-silver", "은색", 480, 177, 4.5)]],
  ["자개", [pic("p-rectangle", "네모", 480, 204, 4), pic("p-oval", "타원", 480, 276, 4), pic("p-scalloped", "물결 원", 472, 461, 3)]],
];

export const LABELS: ExtraPic[] = LABEL_GROUPS.flatMap(([, l]) => l);
export const extraPic = (id?: string) => (id ? [...BUTTONS, ...LABELS].find(p => p.id === id) : undefined);
export const extraSrc = (id: string) => `/extras/${id}.webp`;
