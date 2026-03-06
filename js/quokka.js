import { CANVAS, QUOKKA } from './constants.js';

let x = 0;
let y = 0;
let velocityY = 0;
let currentStairIndex = -1;

export function getQuokka() {
  return { x, y, width: QUOKKA.WIDTH, height: QUOKKA.HEIGHT, velocityY };
}

export function initQuokka(startX, startY) {
  x = startX;
  y = startY;
  velocityY = 0;
  currentStairIndex = -1;
}

export function setQuokkaPosition(nx, ny) {
  x = nx;
  y = ny;
}

export function setVelocityY(vy) {
  velocityY = vy;
}

export function getVelocityY() {
  return velocityY;
}

/**
 * 중력 적용
 */
export function tickQuokka(dt) {
  velocityY += QUOKKA.GRAVITY * dt;
  y += velocityY * dt;
  x = Math.max(QUOKKA.WIDTH / 2, Math.min(CANVAS.WIDTH - QUOKKA.WIDTH / 2, x));
}

/**
 * 좌측 이동 (상대적)
 */
export function moveLeft(dt = 1 / 60) {
  x -= QUOKKA.MOVE_SPEED * dt;
  x = Math.max(QUOKKA.WIDTH / 2, x);
}

/**
 * 우측 이동
 */
export function moveRight(dt = 1 / 60) {
  x += QUOKKA.MOVE_SPEED * dt;
  x = Math.min(CANVAS.WIDTH - QUOKKA.WIDTH / 2, x);
}

/**
 * 계단 위에 착지했을 때 속도 0, 위치 스냅
 */
export function landOnStair(stairY) {
  velocityY = 0;
  y = stairY - QUOKKA.HEIGHT + 2;
}

export function getCenterX() {
  return x;
}

export function getBottomY() {
  return y + QUOKKA.HEIGHT;
}

export function getLeft() {
  return x - QUOKKA.WIDTH / 2;
}

export function getRight() {
  return x + QUOKKA.WIDTH / 2;
}
