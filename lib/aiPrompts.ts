// "AI와 상의" lines under the step titles (components/AskAiLine.tsx): the words shown and the question
// put into the AI sheet's box (not sent: the user sends it). One place to edit them.
export const AI_LINES = {
  item: { text: "고민된다면, Yarni와 상의해 보십시오", prompt: "초보인데 무엇을 떠 보면 좋습니까?" },
  yarn: { text: "실 굵기를 모르겠다면, Yarni에게 물어보십시오", prompt: "실 라벨 사진으로 굵기를 알려 줄 수 있습니까?" },
  size: { text: "어떤 크기가 좋을지 Yarni와 정해 보십시오", prompt: "이 품목은 보통 몇 cm로 만듭니다?" },
} as const;
export type AiLineKey = keyof typeof AI_LINES;
