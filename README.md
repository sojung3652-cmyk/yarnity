# Yarnity

코바늘 도안 웹앱. 실·바늘·원하는 크기로 단별 도안을 계산하고, 한 단씩 따라 뜨게 해 준다.
기획은 `PLAN.md`, 원래 단일 HTML 프로토타입은 `legacy/index.html`.

## 실행

```bash
npm install
cp .env.example .env.local   # ANTHROPIC_API_KEY 입력 (없으면 AI 대화만 꺼지고 나머지는 동작)
npm run dev
```

## 구조

- `lib/pattern.ts` 코/단 계산 엔진 (순수 함수). `tests/pattern.test.ts`가 원본 엔진(`tests/legacy-engine.js`)과 결과가 완전히 같은지 확인한다.
- `lib/chat.ts` RULES 프롬프트, 응답 형식, tolerant JSON 파싱
- `app/api/chat/route.ts` Anthropic API 호출 (서버에서만 키 사용)
- `components/Book/` 3D 책, 뜨개 텍스처 굽기(`yarnTexture.ts`)
- 저장: localStorage `iyarn.projects`, `iyarn.active`, `iyarn.draft`, `iyarn.theme` (프로토타입과 같은 키·구조)

```bash
npm test        # 계산 엔진 + 파싱 테스트
npm run build
```
