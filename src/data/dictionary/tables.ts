// 한눈에 보는 표 (뜨개 사전 · web). Checked against:
// - 바늘 호수: Lovecrafts / Craft Yarn Council (mm · US · UK), ronique.jp (かぎ針 2/0~5/0호), a Japanese 棒針 chart
//   (0호 2.1mm, 0.3mm a step). Brands differ a little: mm is the one to trust.
// - 실 굵기: Craft Yarn Council Standard Yarn Weight System (0 Lace ~ 7 Jumbo), gauge over 10cm.
// - 용어: Lovecrafts, Petals to Picots, iLikeCrochet (US -> UK one step up).
// - 세탁 기호: ISO 3758 (wash tub, bleach triangle, drying square, iron, professional-care circle).
import type { DictTable } from "./types";

export const TABLES: DictTable[] = [
  {
    id: "needle-sizes", title: "바늘 호수 대조", short: "한국 호수 · mm · US · UK",
    cols: ["바늘", "한국·일본 호수", "mm", "US", "UK(옛 번호)"],
    rows: [
      ["코바늘", "2/0호", "2.0", "-", "14"],
      ["코바늘", "-", "2.25", "B-1", "13"],
      ["코바늘", "3/0호", "2.3", "-", "-"],
      ["코바늘", "4/0호", "2.5", "-", "12"],
      ["코바늘", "-", "2.75", "C-2", "-"],
      ["코바늘", "5/0호", "3.0", "-", "11"],
      ["코바늘", "-", "3.25", "D-3", "10"],
      ["코바늘", "6/0호", "3.5", "E-4", "9"],
      ["코바늘", "-", "3.75", "F-5", "-"],
      ["코바늘", "7/0호", "4.0", "G-6", "8"],
      ["코바늘", "7.5/0호", "4.5", "7", "7"],
      ["코바늘", "8/0호", "5.0", "H-8", "6"],
      ["코바늘", "9/0호", "5.5", "I-9", "5"],
      ["코바늘", "10/0호", "6.0", "J-10", "4"],
      ["코바늘", "-", "8.0", "L-11", "0"],
      ["코바늘", "-", "10.0", "N-15", "000"],
      ["대바늘", "0호", "2.1", "가까운 0 (2.0)", "-"],
      ["대바늘", "3호", "3.0", "가까운 2½ (3.0)", "11"],
      ["대바늘", "5호", "3.6", "가까운 4 (3.5)", "-"],
      ["대바늘", "6호", "3.9", "가까운 5 (3.75)", "-"],
      ["대바늘", "7호", "4.2", "가까운 6 (4.0)", "-"],
      ["대바늘", "8호", "4.5", "7", "7"],
      ["대바늘", "10호", "5.1", "가까운 8 (5.0)", "-"],
      ["대바늘", "13호", "6.0", "10", "4"],
      ["대바늘", "15호", "6.6", "가까운 10½ (6.5)", "-"],
    ],
  },
  {
    id: "yarn-weights", title: "실 굵기 분류", short: "Lace부터 Jumbo까지",
    cols: ["번호", "이름", "다른 이름", "대바늘 게이지(10cm)", "대바늘", "코바늘"],
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
  {
    id: "care-symbols", title: "세탁 기호", short: "실 라벨의 그림 읽기",
    cols: ["그림", "뜻"],
    rows: [
      ["대야 (안에 숫자)", "물세탁 가능, 숫자는 물 온도의 상한(°C)"],
      ["대야 + 손", "손세탁만"],
      ["대야 아래 선 1~2줄", "약하게(1줄), 아주 약하게(2줄) 세탁"],
      ["대야에 X", "물세탁 금지"],
      ["빈 삼각형", "표백제 사용 가능"],
      ["빗금 두 줄 삼각형", "산소계 표백제만"],
      ["삼각형에 X", "표백 금지"],
      ["네모 안 원 (점 1~2개)", "텀블 건조 가능, 낮은(1) · 보통(2) 온도"],
      ["네모 안 원에 X", "텀블 건조 금지"],
      ["네모 안 가로줄", "눕혀서 말리기"],
      ["네모 안 세로줄", "걸어서 말리기"],
      ["다리미 (점 1~3개)", "110°C · 150°C · 200°C 이하로 다림질"],
      ["다리미에 X", "다림질 금지"],
      ["원 (안에 P · F)", "드라이클리닝 가능, 글자는 용제 종류"],
      ["원에 X", "드라이클리닝 금지"],
    ],
  },
];
