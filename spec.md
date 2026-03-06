# 무한의 계단 (Quokka Stairs) — 기술 명세

## 1. 기술 스택

- **런타임**: 브라우저 (HTML5 + CSS3 + JavaScript ES6+)
- **렌더링**: Canvas 2D API (게임 화면), DOM (UI·텍스트)
- **저장소**: localStorage (키: `quokkaStairsHighScore`)
- **테스트**: Node.js + Jest (게임 로직 유닛 테스트), 가능 시 간단한 E2E/통합 시나리오

## 2. 디렉터리 구조

```
infinite-stairs-game/
├── PRD.md
├── spec.md
├── index.html          # 진입점, 방향 전환/오르기 버튼 포함
├── css/
│   └── style.css       # 버튼 스타일 포함
├── js/
│   ├── game-bundle.js  # ★ 실제 실행용 단일 스크립트 (ES 모듈 없음, file:// 지원)
│   ├── main.js         # (모듈 버전 진입)
│   ├── game.js
│   ├── stairs.js
│   ├── quokka.js
│   ├── score.js
│   ├── render.js
│   └── constants.js
├── tests/
│   ├── run.js          # Node 단일 실행 테스트
│   ├── score.test.js
│   ├── stairs.test.js
│   └── game.test.js
└── package.json
```

## 3. 핵심 모듈 역할

| 모듈 | 역할 |
|------|------|
| `constants.js` | 캔버스 크기, 계단 높이/너비, 쿼카 크기, 중력·점프력 등 |
| `score.js` | `getScore()`, `addScore(n)`, `getHighScore()`, `saveHighScore()`, `resetScore()` |
| `stairs.js` | 계단 배열 관리, `tick(dt)`, `getCurrentStairs()`, 충돌용 바운드 |
| `quokka.js` | 위치·속도, `jumpLeft()`/`jumpRight()` 또는 `move(direction)`, `tick(dt)`, 바운드 |
| `game.js` | 상태(READY/PLAYING/GAMEOVER), 루프, 쿼카–계단 충돌, 점수 연동 |
| `main.js` | DOM 로드, 캔버스·버튼 바인딩, 게임 인스턴스 생성·시작 |

## 4. 게임 규칙 (구현 관점, 나무위키 반영)

- **계단**: 지그재그(층마다 좌/우 번갈아) 한 층당 한 발판. 현재 층 기준 화면 Y 계산으로 캐릭터 고정·계단 스크롤.
- **쿼카**: 한 번에 한 칸(한 계단 너비) 좌/우 이동 또는 “다음 계단”으로 점프. 계단 밖으로 나가면 낙하.
- **조작**: 버튼 두 개. **오르기** = 한 층 올라감. **방향 전환** = 방향 바꾼 뒤 한 층 올라감.
- **체력 게이지**: 상단 바. 매 프레임 감소, 층이 올라갈수록 감소 속도 증가. 0이 되면 게임 오버.
- **점수**: 올라간 층 수. 최고 기록은 localStorage에 저장.

## 5. 데이터 구조 (요지)

- **Stair**: `{ x, y, width, height }` (혹은 `left, top, width, height`)
- **Quokka**: `{ x, y, width, height, velocityY }` 등
- **Game state**: `READY | PLAYING | GAMEOVER`, `score`, `highScore`

## 6. 테스트 전략

- **유닛**: `score.js` — get/save/reset high score (localStorage 목).
- **유닛**: `stairs.js` — 계단 생성·위치·리스트 (DOM/Canvas 없이 데이터만).
- **유닛**: `game.js` — 충돌 판정, 상태 전이 (가능한 한 순수 함수로 분리).
- **통합/수동**: 브라우저에서 한 판 플레이 → 게임 오버 → 최고점 표시 확인.

## 7. 변경 이력 (구현 중 반영)

- **구현**: `render.js` 추가 — 배경·계단·쿼카(캔버스로 귀여운 얼굴+몸 그리기), READY/GAMEOVER 오버레이.
- **구현**: `main.js` — requestAnimationFrame 루프, ←/→ 이동, 스페이스/클릭으로 시작·재시작.
- **테스트**: Jest 대신 `node tests/run.js`로 실행 가능한 단일 테스트 러너 추가 (Node만 있으면 동작).
- **통합 테스트**: `run.js`에 init → start → 연속 tick → 상태/점수 검증 시나리오 포함.
- **E2E**: 브라우저에서 한 판 플레이 → 게임 오버 → 최고점 표시는 수동 확인.
- **리빌드 (나무위키 기준)**: 실제 게임은 `js/game-bundle.js` 단일 파일로 제공. ES 모듈 미사용으로 **file:// 에서도 동작**. 규칙: 오르기/방향 전환 두 버튼, 체력 게이지(층 올라갈수록 감소 속도 증가), 지그재그 계단, 점수=층 수.

---

*문서 버전: 1.0 | 최초 작성*
