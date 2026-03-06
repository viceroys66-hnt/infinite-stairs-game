/**
 * Node로 실행 가능한 테스트 러너
 * 실행: node tests/run.js
 */
import assert from 'assert';
import {
  getScore,
  addScore,
  resetScore,
  getHighScore,
  saveHighScore,
  setStorage,
} from '../js/score.js';
import {
  getStairs,
  initStairs,
  isOnStair,
  tickStairs,
} from '../js/stairs.js';
import { STAIR } from '../js/constants.js';
import {
  getState,
  init,
  start,
  gameOver,
  findLandingStair,
  tick,
  getScore as getGameScore,
} from '../js/game.js';
import { STATE } from '../js/constants.js';
import * as quokka from '../js/quokka.js';
import * as stairsMod from '../js/stairs.js';
import * as scoreMod from '../js/score.js';

function scoreTests() {
  const mockStorage = {};
  setStorage({
    getItem(key) {
      return mockStorage[key] ?? null;
    },
    setItem(key, value) {
      mockStorage[key] = value;
    },
  });
  resetScore();
  assert.strictEqual(getScore(), 0, '초기 점수 0');
  addScore(1);
  assert.strictEqual(getScore(), 1, 'addScore(1) 후 1');
  resetScore();
  assert.strictEqual(getScore(), 0, 'reset 후 0');
  assert.strictEqual(getHighScore(), 0, '저장 없을 때 최고점 0');
  mockStorage['quokkaStairsHighScore'] = '100';
  assert.strictEqual(getHighScore(), 100, '저장된 최고점 100');
  addScore(50);
  saveHighScore();
  assert.strictEqual(mockStorage['quokkaStairsHighScore'], '50', '새 최고점 저장');
  mockStorage['quokkaStairsHighScore'] = '80';
  addScore(30);
  saveHighScore();
  assert.strictEqual(mockStorage['quokkaStairsHighScore'], '80', '기존 최고점 유지');
  console.log('  score: 통과');
}

function stairsTests() {
  initStairs();
  const list = getStairs();
  assert.ok(list.length >= 1, '계단 1개 이상');
  const s = { x: 100, y: 400, width: 120, height: STAIR.HEIGHT };
  assert.strictEqual(isOnStair(s, 150, 400, 48, 44), true, '계단 위 true');
  assert.strictEqual(isOnStair(s, 50, 400, 48, 44), false, '계단 밖 false');
  const beforeY = list[0].y;
  tickStairs(0.1);
  assert.ok(getStairs()[0].y > beforeY, 'tick 후 y 증가');
  console.log('  stairs: 통과');
}

function gameTests() {
  const mockStorage = {};
  scoreMod.setStorage({
    getItem(k) {
      return mockStorage[k] ?? null;
    },
    setItem(k, v) {
      mockStorage[k] = v;
    },
  });
  init();
  assert.strictEqual(getState(), STATE.READY, 'init 후 READY');
  assert.strictEqual(getGameScore(), 0, '점수 0');
  start();
  assert.strictEqual(getState(), STATE.PLAYING, 'start 후 PLAYING');
  gameOver();
  assert.strictEqual(getState(), STATE.GAMEOVER, 'gameOver 후 GAMEOVER');
  init();
  const list = stairsMod.getStairs();
  const s = list[list.length - 1];
  quokka.initQuokka(s.x + s.width / 2, s.y - 20);
  quokka.setVelocityY(0);
  const found = findLandingStair();
  assert.ok(found != null, '계단 위에 있으면 findLandingStair 반환');
  console.log('  game: 통과');
}

function integrationTests() {
  const mockStorage = {};
  scoreMod.setStorage({
    getItem(k) {
      return mockStorage[k] ?? null;
    },
    setItem(k, v) {
      mockStorage[k] = v;
    },
  });
  init();
  start();
  assert.strictEqual(getState(), STATE.PLAYING, '통합: start 후 PLAYING');
  for (let i = 0; i < 120; i++) {
    tick(0.016);
    if (getState() === STATE.GAMEOVER) break;
  }
  assert.ok(getState() === STATE.GAMEOVER || getState() === STATE.PLAYING, '통합: 틱 후 상태 유효');
  assert.ok(getGameScore() >= 0, '통합: 점수 0 이상');
  console.log('  integration: 통과');
}

let total = 0;
let passed = 0;
const suites = [
  ['score', scoreTests],
  ['stairs', stairsTests],
  ['game', gameTests],
  ['integration', integrationTests],
];
console.log('테스트 실행 중...');
for (const [name, fn] of suites) {
  total += 1;
  try {
    fn();
    passed += 1;
  } catch (e) {
    console.error(`  ${name}: 실패`, e.message);
  }
}
console.log(`\n총 ${passed}/${total} 스위트 통과`);
process.exit(passed === total ? 0 : 1);
