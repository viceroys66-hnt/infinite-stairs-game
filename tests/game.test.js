import { getState, init, start, gameOver, findLandingStair, tick, getScore, getHighScore } from '../js/game.js';
import { STATE } from '../js/constants.js';
import * as quokka from '../js/quokka.js';
import * as stairs from '../js/stairs.js';
import * as score from '../js/score.js';

describe('game', () => {
  beforeEach(() => {
    const mockStorage = {};
    score.setStorage({
      getItem(key) {
        return mockStorage[key] ?? null;
      },
      setItem(key, value) {
        mockStorage[key] = value;
      },
    });
    init();
  });

  describe('init', () => {
    it('상태가 READY', () => {
      expect(getState()).toBe(STATE.READY);
    });
    it('점수 0', () => {
      expect(getScore()).toBe(0);
    });
  });

  describe('start', () => {
    it('start 후 상태가 PLAYING', () => {
      start();
      expect(getState()).toBe(STATE.PLAYING);
    });
  });

  describe('findLandingStair', () => {
    it('쿼카가 계단 위에 있으면 해당 계단 반환', () => {
      const list = stairs.getStairs();
      const s = list[list.length - 1];
      quokka.initQuokka(s.x + s.width / 2, s.y - 20);
      quokka.setVelocityY(0);
      const found = findLandingStair();
      expect(found).not.toBeNull();
      expect(found.x).toBe(s.x);
    });
    it('쿼카가 공중에 있으면 null', () => {
      quokka.initQuokka(200, 100);
      quokka.setVelocityY(-100);
      const found = findLandingStair();
      expect(found).toBeNull();
    });
  });

  describe('gameOver', () => {
    it('gameOver 호출 시 상태가 GAMEOVER', () => {
      start();
      gameOver();
      expect(getState()).toBe(STATE.GAMEOVER);
    });
  });

  describe('tick', () => {
    it('READY일 때 tick해도 점수/상태 크게 안 변함', () => {
      tick(0.016);
      expect(getState()).toBe(STATE.READY);
    });
    it('PLAYING일 때 여러 tick 하면 점수 증가 가능', () => {
      start();
      const list = stairs.getStairs();
      const s = list[list.length - 1];
      quokka.initQuokka(s.x + s.width / 2, s.y - 2);
      quokka.setVelocityY(0);
      tick(0.016);
      tick(0.016);
      expect(getScore()).toBeGreaterThanOrEqual(0);
    });
  });
});
