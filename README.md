# 무한의 계단 (Quokka Stairs)

귀여운 쿼카가 무한히 계단을 오르는 캐주얼 게임입니다.

## 실행 방법

1. **브라우저에서 바로**: `index.html` 파일을 더블클릭하거나 브라우저로 열기.
2. **로컬 서버 (권장)**:  
   `npx serve .` 또는 VS Code Live Server 사용 시 CORS 없이 정상 동작.

## 조작법

- **← / →** : 쿼카 좌우 이동
- **스페이스 / 캔버스 클릭** : 게임 시작, 게임 오버 후 다시 하기

## 테스트

Node.js가 설치된 환경에서:

```bash
node tests/run.js
```

통과 시 `총 3/3 스위트 통과` 메시지가 나옵니다.

## 문서

- [PRD.md](PRD.md) — 제품 요구사항
- [spec.md](spec.md) — 기술 명세

## 게임 기록

최고 점수는 브라우저 **localStorage** (`quokkaStairsHighScore`)에 저장되며, 새로고침 후에도 유지됩니다.
