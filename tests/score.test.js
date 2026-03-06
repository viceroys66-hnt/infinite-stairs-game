import {
  getScore,
  addScore,
  resetScore,
  getHighScore,
  saveHighScore,
  setStorage,
} from '../js/score.js';

describe('score', () => {
  let mockStorage;

  beforeEach(() => {
    mockStorage = {};
    setStorage({
      getItem(key) {
        return mockStorage[key] ?? null;
      },
      setItem(key, value) {
        mockStorage[key] = value;
      },
    });
    resetScore();
  });

  describe('getScore', () => {
    it('초기에는 0', () => {
      expect(getScore()).toBe(0);
    });
  });

  describe('addScore', () => {
    it('addScore(1) 후 점수 1', () => {
      addScore(1);
      expect(getScore()).toBe(1);
    });
    it('addScore(10) 후 점수 10', () => {
      addScore(10);
      expect(getScore()).toBe(10);
    });
  });

  describe('resetScore', () => {
    it('점수 있은 뒤 reset하면 0', () => {
      addScore(5);
      resetScore();
      expect(getScore()).toBe(0);
    });
  });

  describe('getHighScore', () => {
    it('저장된 값 없으면 0', () => {
      expect(getHighScore()).toBe(0);
    });
    it('저장된 값 있으면 해당 숫자', () => {
      mockStorage['quokkaStairsHighScore'] = '100';
      expect(getHighScore()).toBe(100);
    });
  });

  describe('saveHighScore', () => {
    it('현재 점수가 최고점보다 크면 저장', () => {
      addScore(50);
      saveHighScore();
      expect(mockStorage['quokkaStairsHighScore']).toBe('50');
    });
    it('현재 점수가 기존 최고점보다 작으면 덮어쓰지 않음', () => {
      mockStorage['quokkaStairsHighScore'] = '100';
      addScore(30);
      saveHighScore();
      expect(mockStorage['quokkaStairsHighScore']).toBe('100');
    });
    it('현재 점수가 기존 최고점보다 크면 덮어씀', () => {
      mockStorage['quokkaStairsHighScore'] = '50';
      addScore(80);
      saveHighScore();
      expect(mockStorage['quokkaStairsHighScore']).toBe('80');
    });
  });
});
