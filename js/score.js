import { GAME } from './constants.js';

let currentScore = 0;
let storage = typeof localStorage !== 'undefined' ? localStorage : null;

export function setStorage(s) {
  storage = s;
}

export function getScore() {
  return currentScore;
}

export function addScore(n = GAME.SCORE_PER_STEP) {
  currentScore += n;
  return currentScore;
}

export function resetScore() {
  currentScore = 0;
  return currentScore;
}

export function getHighScore() {
  if (!storage) return 0;
  const saved = storage.getItem(GAME.HIGH_SCORE_KEY);
  const num = parseInt(saved, 10);
  return Number.isNaN(num) ? 0 : num;
}

export function saveHighScore() {
  if (!storage) return;
  const high = getHighScore();
  if (currentScore > high) {
    storage.setItem(GAME.HIGH_SCORE_KEY, String(currentScore));
  }
}
