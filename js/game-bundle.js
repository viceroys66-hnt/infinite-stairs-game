/**
 * 무한의 계단 (쿼카 버전) - 나무위키 규칙 반영
 * 오르기/방향전환 버튼, 체력 게이지, 지그재그 계단
 * ES 모듈 없이 file:// 에서도 동작
 */
(function () {
  'use strict';

  var CANVAS_WIDTH = 400;
  var CANVAS_HEIGHT = 520;
  var STAIR_HEIGHT = 20;
  var STAIR_WIDTH = 100;
  var STEP_Y = 36;
  var QUOKKA_W = 44;
  var QUOKKA_H = 40;
  var HIGH_SCORE_KEY = 'quokkaStairsHighScore';

  var DIAGONAL_STEPS = 5; // 좌(0) → 우(4) 사선 5단
  var state = 'READY';
  var floor = 0;
  var direction = 1;
  var quokkaX = 0;
  var quokkaY = 0;
  var scrollOffset = 0;
  var lastTime = 0;
  var jumpProgress = 0;
  var JUMP_DURATION = 0.22;
  var jumpStartX = 0;
  var jumpStartY = 0;
  var canvas, ctx;
  var quokkaImg = new Image();
  quokkaImg.src = 'assets/quokka.png';

  function getHighScore() {
    try {
      var s = localStorage.getItem(HIGH_SCORE_KEY);
      var n = parseInt(s, 10);
      return isNaN(n) ? 0 : n;
    } catch (e) {
      return 0;
    }
  }

  function saveHighScore() {
    try {
      var h = getHighScore();
      if (floor > h) localStorage.setItem(HIGH_SCORE_KEY, String(floor));
    } catch (e) {}
  }

  /** 런덤 지그재그: 게임 시작 시 생성, 층별 위치 배열 */
  var stairPositions = [];

  function buildRandomZigzag() {
    stairPositions = [0];
    var current = 0;
    var goRight = true;
    var maxFloors = 800;
    while (stairPositions.length < maxFloors) {
      var steps = 1 + Math.floor(Math.random() * 4);
      if (goRight) {
        for (var s = 0; s < steps && current < DIAGONAL_STEPS - 1; s++) {
          current++;
          stairPositions.push(current);
        }
        goRight = false;
      } else {
        for (var s = 0; s < steps && current > 0; s++) {
          current--;
          stairPositions.push(current);
        }
        goRight = true;
      }
    }
  }

  /** 층별 계단 위치: 런덤 지그재그 (인덱스 초과 시 0 반환) */
  function getStairPosition(floorIndex) {
    if (floorIndex < 0) return 0;
    if (floorIndex >= stairPositions.length) return 0;
    return stairPositions[floorIndex];
  }

  function getStairX(position) {
    var padding = 24;
    var range = CANVAS_WIDTH - 2 * padding - STAIR_WIDTH;
    if (DIAGONAL_STEPS <= 1) return padding;
    return padding + (position / (DIAGONAL_STEPS - 1)) * range;
  }

  /** 우→좌 구간이면 true → 방향 전환 필수 */
  function needTurnForNext() {
    var curr = getStairPosition(floor);
    var next = getStairPosition(floor + 1);
    return next < curr;
  }

  function getStairScreenY(floorIndex) {
    return CANVAS_HEIGHT - 80 + (floor - floorIndex) * STEP_Y;
  }

  function initGame() {
    state = 'READY';
    floor = 0;
    direction = 1;
    jumpProgress = 0;
    buildRandomZigzag();
    var pos = getStairPosition(0);
    quokkaX = getStairX(pos) + STAIR_WIDTH / 2;
    quokkaY = CANVAS_HEIGHT - 80 - QUOKKA_H;
    scrollOffset = 0;
  }

  function startGame() {
    if (state !== 'READY') return;
    state = 'PLAYING';
    updateFacingDirection();
    lastTime = performance.now();
  }

  /** 현재 이동 방향: 좌→우면 1(오른쪽 보기), 우→좌면 -1(왼쪽 보기) */
  function updateFacingDirection() {
    if (floor === 0) {
      direction = getStairPosition(1) > getStairPosition(0) ? 1 : -1;
      return;
    }
    var curr = getStairPosition(floor);
    var prev = getStairPosition(floor - 1);
    direction = curr > prev ? 1 : -1;
  }

  /** 방향 전환: 방향 바꾼 뒤 바뀐 방향으로 점프. 그 방향에 계단이 없으면 아웃 */
  function turnWithJump() {
    if (state !== 'PLAYING') return;
    var curr = getStairPosition(floor);
    var next = getStairPosition(floor + 1);
    direction = -direction;
    var stairInDirection = (direction === -1 && next < curr) || (direction === 1 && next > curr);
    if (!stairInDirection) {
      gameOver();
      return;
    }
    jumpStartX = quokkaX;
    jumpStartY = quokkaY;
    floor += 1;
    var pos = getStairPosition(floor);
    quokkaX = getStairX(pos) + STAIR_WIDTH / 2;
    quokkaY = CANVAS_HEIGHT - 80 - QUOKKA_H;
    updateFacingDirection();
    jumpProgress = JUMP_DURATION;
  }

  /** 오르기: 한 칸 오름. 방향이 다음 계단과 맞아야 성공 */
  function climb() {
    if (state !== 'PLAYING') return;
    var nextLeft = needTurnForNext();
    if (nextLeft && direction !== -1) {
      gameOver();
      return;
    }
    if (!nextLeft && direction !== 1) {
      gameOver();
      return;
    }
    jumpStartX = quokkaX;
    jumpStartY = quokkaY;
    floor += 1;
    var pos = getStairPosition(floor);
    quokkaX = getStairX(pos) + STAIR_WIDTH / 2;
    quokkaY = CANVAS_HEIGHT - 80 - QUOKKA_H;
    updateFacingDirection();
    jumpProgress = JUMP_DURATION;
  }

  function gameOver() {
    if (state !== 'PLAYING') return;
    state = 'GAMEOVER';
    saveHighScore();
  }

  var animTime = 0;

  function drawBackground() {
    var g = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
    g.addColorStop(0, '#87ceeb');
    g.addColorStop(1, '#b0e0e6');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    var t = animTime * 0.5;

    for (var i = 0; i < 5; i++) {
      var cx = ((i * 87 + t * 8) % (CANVAS_WIDTH + 120)) - 60;
      var cy = 60 + (i % 3) * 70 + Math.sin(t + i) * 15;
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.beginPath();
      ctx.ellipse(cx, cy, 35, 14, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(cx + 22, cy - 4, 28, 12, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(cx + 10, cy + 6, 25, 10, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    for (var b = 0; b < 3; b++) {
      var bx = ((b * 133 + t * 15) % (CANVAS_WIDTH + 80)) - 40;
      var by = 120 + (b % 2) * 100 + Math.sin(t * 1.2 + b * 2) * 20;
      var colors = ['#e74c3c', '#f1c40f', '#3498db'];
      ctx.fillStyle = colors[b % 3];
      ctx.beginPath();
      ctx.ellipse(bx, by, 18, 22, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.2)';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(bx - 4, by + 22);
      ctx.lineTo(bx, by + 30);
      ctx.lineTo(bx + 4, by + 22);
      ctx.fillStyle = colors[b % 3];
      ctx.fill();
      ctx.stroke();
    }
  }

  function drawStairs() {
    var visibleMin = Math.max(0, floor - 2);
    var visibleMax = floor + 14;
    var radius = 8;
    for (var i = visibleMin; i <= visibleMax; i++) {
      var pos = getStairPosition(i);
      var sx = getStairX(pos);
      var sy = getStairScreenY(i);
      if (sy < -STAIR_HEIGHT || sy > CANVAS_HEIGHT + 20) continue;
      var w = STAIR_WIDTH;
      var h = STAIR_HEIGHT;
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(sx + radius, sy);
      ctx.lineTo(sx + w - radius, sy);
      ctx.arcTo(sx + w, sy, sx + w, sy + radius, radius);
      ctx.lineTo(sx + w, sy + h - radius);
      ctx.arcTo(sx + w, sy + h, sx + w - radius, sy + h, radius);
      ctx.lineTo(sx + radius, sy + h);
      ctx.arcTo(sx, sy + h, sx, sy + h - radius, radius);
      ctx.lineTo(sx, sy + radius);
      ctx.arcTo(sx, sy, sx + radius, sy, radius);
      ctx.closePath();
      ctx.fillStyle = '#f8b4c4';
      ctx.fill();
      ctx.strokeStyle = '#e89aad';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = '#fff0f5';
      ctx.fillRect(sx + 2, sy + 2, w - 4, Math.floor(h * 0.4));
      ctx.fillStyle = '#dc3545';
      ctx.beginPath();
      ctx.ellipse(sx + w / 2, sy + 7, 6, 7, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#2d5a27';
      ctx.beginPath();
      ctx.moveTo(sx + w / 2 - 4, sy + 2);
      ctx.lineTo(sx + w / 2, sy - 2);
      ctx.lineTo(sx + w / 2 + 4, sy + 2);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#ffebee';
      for (var d = 0; d < 5; d++) {
        var seedX = sx + w / 2 - 4 + d * 2 + (d % 2) * 0.5;
        var seedY = sy + 6 + (d % 2) * 2;
        ctx.beginPath();
        ctx.arc(seedX, seedY, 1, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  function drawQuokka() {
    var w = QUOKKA_W;
    var h = QUOKKA_H;
    var drawX = quokkaX - w / 2;
    var drawY = quokkaY;
    if (jumpProgress > 0) {
      var t = 1 - jumpProgress / JUMP_DURATION;
      var fromX = jumpStartX - w / 2;
      var toX = quokkaX - w / 2;
      var fromY = jumpStartY;
      var toY = quokkaY;
      drawX = fromX + (toX - fromX) * t;
      drawY = fromY + (toY - fromY) * t - 18 * Math.sin(Math.PI * t);
      var px = drawX + w / 2;
      var py = drawY + h * 0.7;
      for (var s = 0; s < 3; s++) {
        var a = (animTime * 6 + s * 2.1) % (Math.PI * 2);
        var sx = px + Math.cos(a) * (6 + s * 3);
        var sy = py + Math.sin(a) * 4;
        ctx.fillStyle = 'rgba(255,240,220,' + (0.35 * (1 - t)) + ')';
        ctx.beginPath();
        ctx.arc(sx, sy, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    var centerY = drawY + h / 2;
    var flipCenterX = jumpProgress > 0 ? (drawX + w / 2) : quokkaX;

    ctx.save();
    if (state === 'READY' || direction === -1) {
      ctx.translate(flipCenterX, centerY);
      ctx.scale(-1, 1);
      ctx.translate(-flipCenterX, -centerY);
    }
    if (quokkaImg.complete && quokkaImg.naturalWidth > 0) {
      ctx.drawImage(quokkaImg, drawX, drawY, w, h);
    } else {
      var cx = quokkaX;
      var cy = centerY;
      ctx.fillStyle = '#c4a574';
      ctx.beginPath();
      ctx.ellipse(cx, cy, w * 0.45, h * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#a08050';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = '#2c2c2c';
      ctx.beginPath();
      ctx.arc(cx - w * 0.18, cy - h * 0.15, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(cx + w * 0.18, cy - h * 0.15, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawUI() {
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, 0, CANVAS_WIDTH, 42);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(floor + ' 층', 12, 26);
    ctx.textAlign = 'right';
    ctx.fillText('최고: ' + getHighScore() + ' 층', CANVAS_WIDTH - 12, 26);
  }

  function drawReadyOverlay() {
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 24px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('무한의 계단', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 50);
    ctx.font = '16px sans-serif';
    ctx.fillText('귀여운 쿼카와 함께!', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 20);
    ctx.fillText('아래 버튼으로 시작', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 20);
  }

  function drawGameOverOverlay() {
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 22px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('게임 오버', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 50);
    ctx.fillText(floor + ' 층 달성', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 15);
    ctx.fillText('최고 기록: ' + getHighScore() + ' 층', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 20);
    ctx.font = '14px sans-serif';
    ctx.fillText('다시 하기 버튼을 누르세요', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 55);
  }

  function loop(timestamp) {
    var dt = Math.min((timestamp - lastTime) / 1000, 0.1);
    lastTime = timestamp;
    animTime += dt;
    if (jumpProgress > 0) jumpProgress -= dt;

    drawBackground();
    drawStairs();
    drawQuokka();
    drawUI();

    if (state === 'READY') drawReadyOverlay();
    else if (state === 'GAMEOVER') drawGameOverOverlay();

    requestAnimationFrame(loop);
  }

  function onTurnClick() {
    if (state === 'READY') {
      startGame();
      return;
    }
    if (state === 'GAMEOVER') {
      initGame();
      startGame();
      return;
    }
    turnWithJump();
  }

  function onClimbClick() {
    if (state === 'READY') {
      startGame();
      return;
    }
    if (state === 'GAMEOVER') {
      initGame();
      startGame();
      return;
    }
    climb();
  }

  function getCanvasX(e) {
    var rect = canvas.getBoundingClientRect();
    var x = (e.clientX !== undefined ? e.clientX : e.touches[0].clientX) - rect.left;
    var scale = canvas.width / rect.width;
    return x * scale;
  }

  /** 왼쪽=방향 전환, 오른쪽=오르기 */
  function onCanvasTap(e) {
    e.preventDefault();
    if (e.touches && e.touches.length > 0 && e.changedTouches.length === 0) return;
    var x = e.clientX !== undefined ? (e.clientX - canvas.getBoundingClientRect().left) * (canvas.width / canvas.getBoundingClientRect().width) : getCanvasX(e.changedTouches ? e.changedTouches[0] : e);
    if (x < canvas.width / 2) {
      onTurnClick();
    } else {
      onClimbClick();
    }
  }

  function onScreenTouch(x) {
    var w = window.innerWidth;
    if (x < w / 2) onTurnClick();
    else onClimbClick();
  }

  function onKeyDown(e) {
    if (e.key === 'a' || e.key === 'A' || e.key === 'ArrowLeft') {
      e.preventDefault();
      onTurnClick();
    } else if (e.key === ' ') {
      e.preventDefault();
      onClimbClick();
    }
  }

  function init() {
    canvas = document.getElementById('gameCanvas');
    if (!canvas) return;
    ctx = canvas.getContext('2d');
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;
    initGame();
    lastTime = performance.now();
    requestAnimationFrame(loop);

    var btnTurn = document.getElementById('btnTurn');
    var btnClimb = document.getElementById('btnClimb');
    if (btnTurn) btnTurn.addEventListener('click', onTurnClick);
    if (btnClimb) btnClimb.addEventListener('click', onClimbClick);

    document.addEventListener('keydown', onKeyDown);
    canvas.addEventListener('click', onCanvasTap);
    canvas.addEventListener('touchend', function (e) {
      if (e.changedTouches.length === 1) {
        e.preventDefault();
        var touch = e.changedTouches[0];
        var rect = canvas.getBoundingClientRect();
        var x = (touch.clientX - rect.left) * (canvas.width / rect.width);
        if (x < canvas.width / 2) onTurnClick();
        else onClimbClick();
      }
    }, { passive: false });

    var overlay = document.getElementById('touchOverlay');
    if (overlay) {
      overlay.addEventListener('touchend', function (e) {
        if (e.changedTouches.length === 1) {
          e.preventDefault();
          onScreenTouch(e.changedTouches[0].clientX);
        }
      }, { passive: false });
      overlay.addEventListener('touchmove', function (e) { e.preventDefault(); }, { passive: false });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
