import { getStairs, initStairs, isOnStair, tickStairs } from '../js/stairs.js';
import { CANVAS, STAIR } from '../js/constants.js';

describe('stairs', () => {
  beforeEach(() => {
    initStairs();
  });

  describe('initStairs', () => {
    it('최소 1개 이상 계단 생성', () => {
      const list = getStairs();
      expect(list.length).toBeGreaterThanOrEqual(1);
    });
    it('계단에 x, y, width, height 있음', () => {
      const list = getStairs();
      const s = list[0];
      expect(s).toHaveProperty('x');
      expect(s).toHaveProperty('y');
      expect(s).toHaveProperty('width');
      expect(s).toHaveProperty('height');
    });
  });

  describe('isOnStair', () => {
    it('캐릭터가 계단 위에 있으면 true', () => {
      const s = { x: 100, y: 400, width: 120, height: STAIR.HEIGHT };
      const qx = 150;
      const qy = 400;
      const qw = 48;
      const qh = 44;
      expect(isOnStair(s, qx, qy, qw, qh)).toBe(true);
    });
    it('캐릭터가 계단 왼쪽 밖이면 false', () => {
      const s = { x: 100, y: 400, width: 120, height: STAIR.HEIGHT };
      const qx = 50;
      const qy = 400;
      const qw = 48;
      const qh = 44;
      expect(isOnStair(s, qx, qy, qw, qh)).toBe(false);
    });
    it('캐릭터가 계단 오른쪽 밖이면 false', () => {
      const s = { x: 100, y: 400, width: 120, height: STAIR.HEIGHT };
      const qx = 250;
      const qy = 400;
      const qw = 48;
      const qh = 44;
      expect(isOnStair(s, qx, qy, qw, qh)).toBe(false);
    });
  });

  describe('tickStairs', () => {
    it('tick 후 계단 y가 증가(아래로 이동)', () => {
      const list = getStairs();
      const beforeY = list[0].y;
      tickStairs(0.1);
      const afterY = getStairs()[0].y;
      expect(afterY).toBeGreaterThan(beforeY);
    });
  });
});
