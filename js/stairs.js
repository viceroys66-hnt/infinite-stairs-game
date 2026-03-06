import { CANVAS, STAIR } from './constants.js';

/**
 * @typedef {{ x: number, y: number, width: number, height: number }} Stair
 */

let stairs = [];
let scrollY = 0;

/**
 * 계단 목록 반환 (테스트/충돌용)
 */
export function getStairs() {
  return stairs;
}

/**
 * 스크롤 오프셋 반환
 */
export function getScrollY() {
  return scrollY;
}

/**
 * 계단 초기화: 시작용 계단 몇 개 생성
 */
export function initStairs() {
  stairs = [];
  scrollY = 0;
  const first = createStair(CANVAS.WIDTH / 2 - STAIR.MIN_WIDTH / 2, CANVAS.HEIGHT - 80, STAIR.MIN_WIDTH);
  stairs.push(first);
  fillStairsUpTo(CANVAS.HEIGHT + STAIR.GAP_Y * 2);
}

function createStair(x, y, width) {
  return {
    x,
    y,
    width: Math.min(width, STAIR.MAX_WIDTH),
    height: STAIR.HEIGHT,
  };
}

function randomWidth() {
  return STAIR.MIN_WIDTH + Math.random() * (STAIR.MAX_WIDTH - STAIR.MIN_WIDTH);
}

/**
 * 화면 상단까지 계단이 채워지도록 생성
 */
function fillStairsUpTo(maxY) {
  if (stairs.length === 0) return;
  let top = stairs[0].y;
  while (top > -STAIR.HEIGHT * 2) {
    const w = randomWidth();
    const x = Math.max(0, Math.min(CANVAS.WIDTH - w, Math.random() * (CANVAS.WIDTH - w)));
    top -= STAIR.GAP_Y;
    stairs.unshift(createStair(x, top, w));
  }
}

/**
 * @param {Stair} s
 * @param {number} qx - quokka center x
 * @param {number} qy - quokka bottom y
 * @param {number} qw - quokka width
 * @param {number} qh - quokka height
 */
export function isOnStair(s, qx, qy, qw, qh) {
  const stairTop = s.y;
  const stairBottom = s.y + s.height;
  const margin = 4;
  const left = s.x + margin;
  const right = s.x + s.width - margin;
  const qLeft = qx - qw / 2;
  const qRight = qx + qw / 2;
  const verticalOverlap = qy >= stairTop - 2 && qy <= stairBottom + qh * 0.5;
  const horizontalOverlap = qRight > left && qLeft < right;
  return verticalOverlap && horizontalOverlap;
}

/**
 * dt: delta time in seconds
 */
export function tickStairs(dt) {
  scrollY += STAIR.SCROLL_SPEED * dt;
  for (let i = 0; i < stairs.length; i++) {
    stairs[i].y += STAIR.SCROLL_SPEED * dt;
  }
  while (stairs.length > 0 && stairs[stairs.length - 1].y > CANVAS.HEIGHT + 50) {
    stairs.pop();
  }
  if (stairs.length > 0) {
    fillStairsUpTo(-100);
  }
}
