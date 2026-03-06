/**
 * 게임 전역 상수
 */
export const CANVAS = {
  WIDTH: 400,
  HEIGHT: 600,
};

export const STAIR = {
  HEIGHT: 24,
  MIN_WIDTH: 80,
  MAX_WIDTH: 160,
  GAP_Y: 72,
  SCROLL_SPEED: 120,
};

export const QUOKKA = {
  WIDTH: 48,
  HEIGHT: 44,
  GRAVITY: 900,
  JUMP_STRENGTH: -420,
  MOVE_SPEED: 280,
};

export const GAME = {
  FPS: 60,
  SCORE_PER_STEP: 1,
  HIGH_SCORE_KEY: 'quokkaStairsHighScore',
};

export const STATE = {
  READY: 'READY',
  PLAYING: 'PLAYING',
  GAMEOVER: 'GAMEOVER',
};
