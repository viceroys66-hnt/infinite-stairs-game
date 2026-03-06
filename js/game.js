import { CANVAS, STATE } from './constants.js';
import * as stairs from './stairs.js';
import * as quokka from './quokka.js';
import * as score from './score.js';

let state = STATE.READY;
let lastStairId = null;

export function getState() {
  return state;
}

export function setState(s) {
  state = s;
}

export function init() {
  state = STATE.READY;
  lastStairId = null;
  score.resetScore();
  stairs.initStairs();
  const first = stairs.getStairs()[stairs.getStairs().length - 1];
  quokka.initQuokka(first.x + first.width / 2, first.y - 20);
}

export function start() {
  if (state !== STATE.READY) return;
  state = STATE.PLAYING;
  lastStairId = null;
}

/**
 * 게임 오버 처리
 */
export function gameOver() {
  if (state !== STATE.PLAYING) return;
  state = STATE.GAMEOVER;
  score.saveHighScore();
}

/**
 * 현재 서 있는 계단 찾기 (밟고 있는 계단)
 */
export function findLandingStair() {
  const list = stairs.getStairs();
  const q = quokka.getQuokka();
  const qx = quokka.getCenterX();
  const qy = quokka.getBottomY();
  for (let i = 0; i < list.length; i++) {
    if (stairs.isOnStair(list[i], qx, qy, q.width, q.height)) {
      return list[i];
    }
  }
  return null;
}

/**
 * 게임 틱 (PLAYING일 때만)
 */
export function tick(dt) {
  if (state !== STATE.PLAYING) return;

  stairs.tickStairs(dt);
  quokka.tickQuokka(dt);

  const landing = findLandingStair();
  if (landing) {
    quokka.landOnStair(landing.y);
    const stairId = `${landing.x}-${landing.y}`;
    if (stairId !== lastStairId) {
      lastStairId = stairId;
      score.addScore(1);
    }
  } else {
    if (quokka.getBottomY() > CANVAS.HEIGHT + 50) {
      gameOver();
    }
  }
}

export function getScore() {
  return score.getScore();
}

export function getHighScore() {
  return score.getHighScore();
}

export { stairs, quokka, score };
