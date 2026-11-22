// 기타 (뜨개 사전 · web; was 한눈에 보는 표). Checked against:
// - 바늘 호수: Lovecrafts / Craft Yarn Council (mm · US · UK), ronique.jp (かぎ針 2/0~5/0호), a Japanese 棒針 chart
//   (0호 2.1mm, 0.3mm a step). Brands differ a little: mm is the one to trust.
// - 실 굵기: Craft Yarn Council Standard Yarn Weight System (0 Lace ~ 7 Jumbo), gauge over 10cm.
// - 용어: Lovecrafts, Petals to Picots, iLikeCrochet (US -> UK one step up).
// - 사이즈: Craft Yarn Council Standard Body Measurements (머리 · 가슴), 발 길이는 한국 신발 치수(mm) 기준의 범위.
// - 세탁 기호: ISO 3758 (wash tub, bleach triangle, drying square, iron, professional-care circle).
import type { DictTable } from "./types";

export const TABLES: DictTable[] = [
  {
    id: "care-symbols", title: "세탁 기호", short: "실 라벨의 그림 읽기",
    cols: ["그림", "뜻"],
    rows: [
      ["@wash-30", "물세탁 가능, 숫자는 물 온도의 상한(°C)"],
      ["@wash-hand", "손세탁만"],
      ["@wash-gentle", "약하게 세탁 (아래 선 2줄이면 아주 약하게)"],
      ["@wash-no", "물세탁 금지"],
      ["@bleach", "표백제 사용 가능"],
      ["@bleach-oxygen", "산소계 표백제만"],
      ["@bleach-no", "표백 금지"],
      ["@tumble-1", "낮은 온도로 텀블 건조 (점 2개면 보통 온도)"],
      ["@tumble-no", "텀블 건조 금지"],
      ["@dry-flat", "눕혀서 말리기"],
      ["@dry-line", "걸어서 말리기"],
      ["@iron-1", "110°C 이하로 다림질 (점 2개 150°C, 3개 200°C)"],
      ["@iron-no", "다림질 금지"],
      ["@dryclean-p", "드라이클리닝 가능, 글자는 용제 종류 (P · F)"],
      ["@dryclean-no", "드라이클리닝 금지"],
    ],
  },
  {
    id: "body-sizes", title: "사이즈 표", short: "머리 둘레 · 발 길이 · 가슴 둘레",
    cols: ["대상", "치수 (cm)"], num: [1], foot: "모자는 머리 둘레보다 5~10%, 양말은 발 둘레보다 10% 작게 뜹니다. 잴 수 있다면 직접 잰 치수가 가장 정확합니다.",
    groups: [
      { label: "머리 둘레", rows: [
        ["신생아", "33~36"], ["0~6개월", "36~43"], ["6~12개월", "41~48"], ["1~3세", "46~51"],
        ["3~10세", "48~52"], ["청소년 · 머리가 작은 어른", "51~56"], ["어른 여성", "53~56"], ["어른 남성", "56~59"],
      ] },
      { label: "발 길이", rows: [
        ["0~6개월", "9~10"], ["6~12개월", "11~12"], ["1~3세", "13~15"], ["3~5세", "16~17"],
        ["6~9세", "18~21"], ["10~12세", "21~23"], ["어른 여성", "22~25"], ["어른 남성", "25~28"],
      ] },
      { label: "가슴 둘레", rows: [
        ["0~6개월", "41~43"], ["6~12개월", "47"], ["1~2세", "50~53"], ["4세", "58"], ["6세", "64"], ["8세", "66"], ["10세", "71"], ["12세", "76"],
        ["어른 여성 S", "81~86"], ["어른 여성 M", "91~97"], ["어른 여성 L", "102~107"], ["어른 여성 XL", "112~117"],
        ["어른 남성 S", "86~91"], ["어른 남성 M", "97~102"], ["어른 남성 L", "107~112"], ["어른 남성 XL", "117~122"],
      ] },
    ],
  },
  {
    id: "needle-sizes", title: "바늘 호수 대조", short: "한국 호수 · mm · US · UK",
    cols: ["한국·일본 호수", "mm", "US", "UK(옛 번호)"], num: [0, 1, 2, 3], sizeSearch: true,
    groups: [
      { label: "코바늘", rows: [
        ["2/0호", "2.0", "-", "14"], ["-", "2.25", "B-1", "13"], ["3/0호", "2.3", "-", "-"], ["4/0호", "2.5", "-", "12"],
        ["-", "2.75", "C-2", "-"], ["5/0호", "3.0", "-", "11"], ["-", "3.25", "D-3", "10"], ["6/0호", "3.5", "E-4", "9"],
        ["-", "3.75", "F-5", "-"], ["7/0호", "4.0", "G-6", "8"], ["7.5/0호", "4.5", "7", "7"], ["8/0호", "5.0", "H-8", "6"],
        ["9/0호", "5.5", "I-9", "5"], ["10/0호", "6.0", "J-10", "4"], ["-", "8.0", "L-11", "0"], ["-", "10.0", "N-15", "000"],
      ] },
      { label: "대바늘 (US는 가장 가까운 굵기)", rows: [
        ["0호", "2.1", "0 (2.0)", "-"], ["3호", "3.0", "2½ (3.0)", "11"], ["5호", "3.6", "4 (3.5)", "-"], ["6호", "3.9", "5 (3.75)", "-"],
        ["7호", "4.2", "6 (4.0)", "-"], ["8호", "4.5", "7", "7"], ["10호", "5.1", "8 (5.0)", "-"], ["13호", "6.0", "10", "4"], ["15호", "6.6", "10½ (6.5)", "-"],
      ] },
    ],
  },
  {
    id: "yarn-weights", title: "실 굵기 분류", short: "Lace부터 Jumbo까지",
    cols: ["번호", "이름", "다른 이름", "게이지(10cm)", "대바늘", "코바늘"], num: [0, 3, 4, 5],
    rows: [
      ["0", "Lace", "레이스, 2합", "33~40코", "1.5~2.25mm", "1.5~2.25mm"],
      ["1", "Super Fine", "Fingering, Sock", "27~32코", "2.25~3.25mm", "2.25~3.5mm"],
      ["2", "Fine", "Sport, Baby", "23~26코", "3.25~3.75mm", "3.5~4.5mm"],
      ["3", "Light", "DK, Light Worsted", "21~24코", "3.75~4.5mm", "4.5~5.5mm"],
      ["4", "Medium", "Worsted, Aran", "16~20코", "4.5~5.5mm", "5.5~6.5mm"],
      ["5", "Bulky", "Chunky", "12~15코", "5.5~8mm", "6.5~9mm"],
      ["6", "Super Bulky", "Super Chunky, Roving", "7~11코", "8~12.75mm", "9~15mm"],
      ["7", "Jumbo", "Jumbo, Roving", "6코 이하", "12.75mm 이상", "15mm 이상"],
    ],
  },
  {
    id: "us-uk", title: "미국식 · 영국식 용어", short: "같은 이름, 다른 코",
    cols: ["한국어", "미국식 (US)", "영국식 (UK)"],
    rows: [
      ["빼뜨기", "slip stitch (sl st)", "slip stitch (ss)"],
      ["짧은뜨기", "single crochet (sc)", "double crochet (dc)"],
      ["긴뜨기", "half double crochet (hdc)", "half treble (htr)"],
      ["한길긴뜨기", "double crochet (dc)", "treble (tr)"],
      ["두길긴뜨기", "treble (tr)", "double treble (dtr)"],
      ["세길긴뜨기", "double treble (dtr)", "triple treble (ttr)"],
      ["코 막음 (대바늘)", "bind off", "cast off"],
      ["메리야스뜨기 (대바늘)", "stockinette stitch", "stocking stitch"],
      ["게이지", "gauge", "tension"],
      ["바늘 비우기", "yarn over (yo)", "yarn forward / yarn round needle"],
    ],
  },
];
