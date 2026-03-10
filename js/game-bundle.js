/**
 * 무한의 계단 (쿼카 버전) - 나무위키 규칙 반영
 * 오르기/방향전환 버튼, 체력 게이지, 지그재그 계단
 * ES 모듈 없이 file:// 에서도 동작
 */
(function () {
  'use strict';

  var CANVAS_WIDTH = 393;
  var CANVAS_HEIGHT = 852;
  var DESIGN_WIDTH = 393;
  var DESIGN_HEIGHT = 852;
  var GAME_SCALE = 1;
  var GROUND_TOP = Math.round(CANVAS_HEIGHT * 0.88);
  var STUMP_HEIGHT = 65;
  var STAIR0_Y = GROUND_TOP - STUMP_HEIGHT;
  var PADDING = 24;
  var STAIR_WIDTH = 56;
  var STAIR_HEIGHT = Math.round(STAIR_WIDTH * 3 / 4);
  var STEP_Y = STAIR_HEIGHT + 28;
  var QUOKKA_W = 78;
  var QUOKKA_H = 70;
  var QUOKKA_STAND_OFFSET = 5;
  var STAIR_DEPTH = Math.round(STAIR_HEIGHT * 0.35);
  var STAIR_RADIUS = 14;
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
  var fallY = 0;
  var fallVelY = 0;
  var fallRotation = 0;
  var GAMEOVER_MESSAGE = '이런~ 젠장';
  var TIME_LIMIT = 60;
  var timeRemaining = 60;
  var canvas, ctx;
  var quokkaImg = new Image();
  quokkaImg.src = 'assets/quokka.png';
  var stumpImg = new Image();
  stumpImg.src = 'assets/stump.png';
  var stairImg = new Image();
  stairImg.src = 'assets/stair.png';
  var birdImg = new Image();
  birdImg.src = 'assets/bird.png';
  var bgImg = new Image();
  bgImg.src = 'assets/background.png';
  var bgBirdImg = new Image();
  bgBirdImg.src = 'assets/bgBird.png';

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
    var centerPos = Math.floor(DIAGONAL_STEPS / 2);
    stairPositions = [centerPos];
    var current = centerPos;
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
    var range = CANVAS_WIDTH - 2 * PADDING - STAIR_WIDTH;
    if (DIAGONAL_STEPS <= 1) return PADDING;
    return PADDING + (position / (DIAGONAL_STEPS - 1)) * range;
  }

  /** 우→좌 구간이면 true → 방향 전환 필수 */
  function needTurnForNext() {
    var curr = getStairPosition(floor);
    var next = getStairPosition(floor + 1);
    return next < curr;
  }

  function getStairScreenY(floorIndex) {
    return STAIR0_Y + (floor - floorIndex) * STEP_Y;
  }

  function initGame() {
    state = 'READY';
    floor = 0;
    jumpProgress = 0;
    fallVelY = 0;
    timeRemaining = TIME_LIMIT;
    buildRandomZigzag();
    direction = getStairPosition(1) > getStairPosition(0) ? 1 : -1;
    var pos = getStairPosition(0);
    quokkaX = getStairX(pos) + STAIR_WIDTH / 2;
    quokkaY = STAIR0_Y - QUOKKA_H + 3;
    scrollOffset = 0;
  }

  function startGame() {
    if (state !== 'READY') return;
    state = 'PLAYING';
    timeRemaining = TIME_LIMIT;
    updateFacingDirection();
    updateButtonVisibility();
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
    quokkaY = STAIR0_Y - QUOKKA_H + 3;
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
    quokkaY = STAIR0_Y - QUOKKA_H + 3;
    updateFacingDirection();
    jumpProgress = JUMP_DURATION;
  }

  function gameOver() {
    if (state !== 'PLAYING') return;
    state = 'GAMEOVER';
    fallY = quokkaY;
    fallVelY = 0;
    fallRotation = 0;
    saveHighScore();
    updateButtonVisibility();
  }

  var animTime = 0;

  function drawBackground() {
    var t = animTime * 0.4;
    var S = GAME_SCALE;
    var W = CANVAS_WIDTH;
    var H = CANVAS_HEIGHT;

    if (bgImg.complete && bgImg.naturalWidth > 0) {
      ctx.save();
      ctx.filter = 'blur(1.5px)';
      ctx.drawImage(bgImg, 0, 0, bgImg.naturalWidth, bgImg.naturalHeight, 0, 0, W, H);
      ctx.restore();
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, W, H * 0.55);
      ctx.clip();
      ctx.filter = 'blur(3px)';
      ctx.drawImage(bgImg, 0, 0, bgImg.naturalWidth, bgImg.naturalHeight, 0, 0, W, H);
      ctx.restore();
    } else {
      ctx.fillStyle = '#87ceeb';
      ctx.fillRect(0, 0, W, H);
    }

    // 배경 새 – 우측→좌측은 원본, 좌측→우측은 좌우 반전 / 날개짓
    if (bgBirdImg.complete && bgBirdImg.naturalWidth > 0) {
      var cycle = W + 100 * S;
      for (var bird = 0; bird < 2; bird++) {
        var phase = (bird * 180 * S + t * 28) % cycle;
        var moveRight = bird % 2 === 1;
        var btx = moveRight ? phase - 50 * S : (W + 60 * S) - phase;
        var bty = 50 * S + (bird % 3) * 90 * S + Math.sin(t * 1.2 + bird * 1.5) * 14 * S;
        var flapPhase = Math.sin(t * 24 + bird * 1.6);
        bty += flapPhase * 6 * S;
        var bodyScale = 0.7 + (bird % 3) * 0.15;
        var bw = 48 * S * bodyScale;
        var bh = 36 * S * bodyScale;
        ctx.save();
        ctx.translate(btx, bty);
        ctx.rotate(flapPhase * 0.07);
        if (!moveRight) ctx.scale(-1, 1);
        ctx.drawImage(bgBirdImg, 0, 0, bgBirdImg.naturalWidth, bgBirdImg.naturalHeight, -bw / 2, -bh / 2, bw, bh);
        ctx.restore();
      }
    } else {
      for (var bird = 0; bird < 2; bird++) {
        var btx = ((bird * 180 * S + t * 28) % (W + 100 * S)) - 50 * S;
        var bty = 50 * S + (bird % 3) * 90 * S + Math.sin(t * 1.2 + bird * 1.5) * 14 * S;
        var bodyScale = 0.75 + (bird % 3) * 0.2;
        var bodyW = 6 * bodyScale;
        var bodyH = 4.5 * bodyScale * (0.9 + (bird % 2) * 0.2);
        ctx.save();
        ctx.translate(btx, bty);
        ctx.scale(S, S);
        ctx.fillStyle = 'rgba(30,28,35,0.9)';
        ctx.beginPath();
        ctx.ellipse(1, 0, bodyW, bodyH, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }
  }

  function roundRect(ctx, x, y, width, height, r) {
    if (r > height / 2) r = height / 2;
    if (r > width / 2) r = width / 2;
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + width - r, y);
    ctx.arcTo(x + width, y, x + width, y + r, r);
    ctx.lineTo(x + width, y + height - r);
    ctx.arcTo(x + width, y + height, x + width - r, y + height, r);
    ctx.lineTo(x + r, y + height);
    ctx.arcTo(x, y + height, x, y + height - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
  }

  function drawGround() {
    var stumpHalfH = (STAIR_HEIGHT + STAIR_DEPTH) * 1.3 / 2;
    var groundStartY = floor === 0 ? STAIR0_Y + stumpHalfH : GROUND_TOP + floor * STEP_Y;
    if (groundStartY >= CANVAS_HEIGHT + 20) return;
    var gTop = groundStartY;
    var stumpCx = getStairX(getStairPosition(0)) + STAIR_WIDTH / 2;
    var stumpW = 116 * GAME_SCALE;
    var grassHeight = CANVAS_HEIGHT - gTop + Math.round(60 * GAME_SCALE);
    var grassG = ctx.createLinearGradient(0, gTop, 0, gTop + grassHeight);
    grassG.addColorStop(0, '#4a9050');
    grassG.addColorStop(0.3, '#3d7a42');
    grassG.addColorStop(0.7, '#357035');
    grassG.addColorStop(1, '#2a5a2d');
    ctx.fillStyle = grassG;
    ctx.fillRect(0, gTop, CANVAS_WIDTH, grassHeight);
    ctx.shadowColor = 'rgba(0,0,0,0.2)';
    ctx.shadowBlur = 3;
    ctx.shadowOffsetY = 2;
    var grassStep = 37 * GAME_SCALE;
    var grassOffset = 30 * GAME_SCALE;
    for (var g = 0; g < 55; g++) {
      var gx = (g * grassStep + Math.floor(animTime * 2) % 80) % (CANVAS_WIDTH + 60 * GAME_SCALE) - grassOffset;
      var gy = gTop + 10 * GAME_SCALE + (g % 6) * 18 * GAME_SCALE + (g % 4) * 6 * GAME_SCALE;
      if (gy > CANVAS_HEIGHT + 10) continue;
      if (state === 'READY' && floor === 0) {
        var distFromStump = Math.abs(gx - stumpCx);
        if (distFromStump < stumpW / 2 + 25 * GAME_SCALE && gy < gTop + 50 * GAME_SCALE) continue;
      }
      var bladeW = 4 * GAME_SCALE;
      var bladeH = 10 * GAME_SCALE;
      var bladeG = ctx.createLinearGradient(gx - bladeW, gy, gx + bladeW, gy + bladeH);
      bladeG.addColorStop(0, 'rgba(70,120,60,0.9)');
      bladeG.addColorStop(1, 'rgba(50,90,45,0.95)');
      ctx.fillStyle = bladeG;
      ctx.beginPath();
      ctx.moveTo(gx, gy + 8 * GAME_SCALE);
      ctx.lineTo(gx - 3 * GAME_SCALE, gy);
      ctx.lineTo(gx + 1 * GAME_SCALE, gy + 6 * GAME_SCALE);
      ctx.closePath();
      ctx.fill();
    }
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    function drawTree(tx, baseY, scale, variant) {
      variant = variant || 0;
      var s = GAME_SCALE * scale;
      var trunkH = (16 + (variant % 2) * 4) * s;
      var trunkW = (5 + variant % 2) * s;
      var coneH = (48 + (variant % 3) * 8) * s;
      var coneW = (28 + (variant % 2) * 8) * s;
      if (variant === 2) { coneH = coneH * 1.1; coneW = coneW * 0.85; }
      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,0.2)';
      ctx.shadowBlur = 4;
      ctx.shadowOffsetY = 2;
      ctx.fillStyle = '#5c4033';
      ctx.fillRect(tx - trunkW / 2, baseY - trunkH, trunkW, trunkH);
      var tipY = baseY - trunkH - coneH;
      var leftX = tx - coneW / 2;
      var rightX = tx + coneW / 2;
      var pineG = ctx.createLinearGradient(tx - coneW / 2, tipY, tx + coneW / 2, baseY - trunkH);
      pineG.addColorStop(0, '#3d6b32');
      pineG.addColorStop(0.3, '#4a7c3d');
      pineG.addColorStop(0.6, '#5a9050');
      pineG.addColorStop(0.85, '#4a7c3d');
      pineG.addColorStop(1, '#3d6b32');
      ctx.fillStyle = pineG;
      ctx.beginPath();
      ctx.moveTo(tx, tipY);
      ctx.lineTo(leftX, baseY - trunkH);
      ctx.lineTo(rightX, baseY - trunkH);
      ctx.closePath();
      ctx.fill();
      if (variant === 1) {
        ctx.beginPath();
        ctx.moveTo(tx, tipY + coneH * 0.5);
        ctx.lineTo(leftX + coneW * 0.2, baseY - trunkH);
        ctx.lineTo(rightX - coneW * 0.2, baseY - trunkH);
        ctx.closePath();
        ctx.fillStyle = 'rgba(70,110,85,0.6)';
        ctx.fill();
      }
      ctx.beginPath();
      ctx.moveTo(tx, tipY + coneH * 0.35);
      ctx.lineTo(leftX + coneW * 0.15, baseY - trunkH);
      ctx.lineTo(rightX - coneW * 0.15, baseY - trunkH);
      ctx.closePath();
      ctx.fillStyle = 'rgba(90,130,95,0.5)';
      ctx.fill();
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.restore();
    }
    var treeBaseY = gTop + 8 * GAME_SCALE + Math.floor(animTime * 0.5) % 4;
    drawTree(28 * GAME_SCALE, treeBaseY, 1, 0);
    drawTree(62 * GAME_SCALE, treeBaseY + 12 * GAME_SCALE, 0.85, 1);
    drawTree(95 * GAME_SCALE, treeBaseY - 5 * GAME_SCALE, 1.1, 2);
    drawTree(CANVAS_WIDTH - 28 * GAME_SCALE, treeBaseY + 5 * GAME_SCALE, 0.9, 0);
    drawTree(CANVAS_WIDTH - 65 * GAME_SCALE, treeBaseY - 8 * GAME_SCALE, 1.05, 1);
    drawTree(CANVAS_WIDTH - 98 * GAME_SCALE, treeBaseY + 8 * GAME_SCALE, 0.8, 2);
  }

  var STUMP_SCALE = 1.3;
  function drawStump() {
    var w = STAIR_WIDTH;
    var h = STAIR_HEIGHT;
    var d = STAIR_DEPTH;
    var pos = getStairPosition(0);
    var sx = getStairX(pos);
    var stumpDrawW = w * 1.5 * STUMP_SCALE;
    var stumpDrawH = (h + d) * STUMP_SCALE;
    var stumpDrawX = sx + w / 2 - stumpDrawW / 2;
    var stumpDrawY = STAIR0_Y;
    ctx.save();
    if (stumpImg.complete && stumpImg.naturalWidth > 0) {
      ctx.shadowColor = 'rgba(0,0,0,0.25)';
      ctx.shadowBlur = 8;
      ctx.shadowOffsetY = 4;
      ctx.drawImage(stumpImg, stumpDrawX, stumpDrawY, stumpDrawW, stumpDrawH);
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
    } else {
      var cx = sx + w / 2;
      var topY = STAIR0_Y;
      var left = stumpDrawX;
      var stumpH = stumpDrawH;
      var stumpW = stumpDrawW;
      var bottomY = topY + stumpH;
      ctx.shadowColor = 'rgba(0,0,0,0.45)';
      ctx.shadowBlur = 16;
      ctx.shadowOffsetY = 8;
      ctx.beginPath();
      ctx.ellipse(cx, bottomY + 4, stumpW / 2 + 4, 10, 0, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.fill();
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      var topRadial = ctx.createRadialGradient(cx - 20, topY - 5, 0, cx, topY, stumpW / 2 + 10);
      topRadial.addColorStop(0, '#b09030');
      topRadial.addColorStop(0.4, '#9a7a20');
      topRadial.addColorStop(0.8, '#7a5a10');
      topRadial.addColorStop(1, '#5a3a08');
      ctx.fillStyle = topRadial;
      ctx.beginPath();
      ctx.ellipse(cx, topY, stumpW / 2, 12, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.25)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      var sideG = ctx.createLinearGradient(left, topY, left + stumpW, topY);
      sideG.addColorStop(0, '#5a3a0a');
      sideG.addColorStop(0.5, '#9a7a24');
      sideG.addColorStop(1, '#5a3a0a');
      ctx.fillStyle = sideG;
      ctx.beginPath();
      ctx.moveTo(left, topY + 12);
      ctx.lineTo(left + stumpW, topY + 12);
      ctx.lineTo(left + stumpW - 5, bottomY + 4);
      ctx.lineTo(left + 5, bottomY + 4);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#4a2a06';
      ctx.lineWidth = 2;
      for (var ring = 1; ring <= 3; ring++) {
        var ry = topY + 14 + ring * (stumpH / 4);
        ctx.beginPath();
        ctx.ellipse(cx, ry, stumpW / 2 - 5, 4, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  function drawStairs() {
    var visibleMin = Math.max(0, floor - 1);
    var visibleMax = floor + 9;
    var r = Math.min(STAIR_RADIUS, STAIR_HEIGHT / 2 - 1);
    for (var i = visibleMin; i <= visibleMax; i++) {
      if (state === 'READY' && i === 0) continue;
      var pos = getStairPosition(i);
      var sx = getStairX(pos);
      var sy = getStairScreenY(i);
      if (sy < -STAIR_HEIGHT - 20 || sy > CANVAS_HEIGHT + 20) continue;
      var w = STAIR_WIDTH;
      var h = STAIR_HEIGHT;
      var d = STAIR_DEPTH;
      if (i === 0 && stumpImg.complete && stumpImg.naturalWidth > 0) {
        var stumpDrawW = w * 1.5 * STUMP_SCALE;
        var stumpDrawH = (h + d) * STUMP_SCALE;
        var stumpDrawX = sx + w / 2 - stumpDrawW / 2;
        ctx.save();
        ctx.shadowColor = 'rgba(0,0,0,0.25)';
        ctx.shadowBlur = 8;
        ctx.shadowOffsetY = 4;
        ctx.drawImage(stumpImg, stumpDrawX, sy, stumpDrawW, stumpDrawH);
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.restore();
        continue;
      }
      ctx.save();
      if (stairImg.complete && stairImg.naturalWidth > 0) {
        var stairDrawW = w * 1.5;
        var stairDrawX = sx + w / 2 - stairDrawW / 2;
        ctx.shadowColor = 'rgba(0,0,0,0.3)';
        ctx.shadowBlur = 6;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 4;
        ctx.drawImage(stairImg, stairDrawX, sy, stairDrawW, h + d);
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
      } else {
        // 1) 그림자 (동글동글)
        ctx.shadowColor = 'rgba(0,0,0,0.3)';
        ctx.shadowBlur = 6;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 4;
        ctx.beginPath();
        roundRect(ctx, sx + 2, sy + 3, w, h + d, r);
        ctx.closePath();
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.fill();
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;

        // 2) 흙덩이 앞면
        ctx.fillStyle = '#5a5a4a';
        ctx.fillRect(sx, sy + h, w, d);
        ctx.fillStyle = '#4a4a3a';
        ctx.fillRect(sx, sy + h + d - 2, w, 2);

        // 3) 흙덩이 윗면 (둥근 블록)
        ctx.beginPath();
        roundRect(ctx, sx, sy, w, h, r);
        ctx.closePath();
        var dirtG = ctx.createLinearGradient(sx, sy, sx, sy + h);
        dirtG.addColorStop(0, '#6a6a5a');
        dirtG.addColorStop(0.5, '#5a5a4a');
        dirtG.addColorStop(1, '#4a4a3a');
        ctx.fillStyle = dirtG;
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.12)';
        ctx.lineWidth = 1;
        ctx.stroke();

        // 4) 윗면 잔디
        ctx.beginPath();
        roundRect(ctx, sx + 1, sy + 1, w - 2, Math.floor(h * 0.5), r - 1);
        ctx.closePath();
        ctx.fillStyle = '#4a8a4d';
        ctx.fill();
        ctx.fillStyle = '#5aa05d';
        for (var g = 0; g < 8; g++) {
          var gx = sx + 6 + (g % 3) * (w / 3) + (Math.sin(i + g) * 2);
          var gy = sy + 3 + Math.floor(g / 3) * 4;
          ctx.beginPath();
          ctx.arc(gx, gy + 3, 1.8, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = '#6ab06d';
        for (var g2 = 0; g2 < 5; g2++) {
          var g2x = sx + 10 + (g2 % 2) * (w / 2.2);
          var g2y = sy + 5 + (g2 % 2) * 3;
          ctx.beginPath();
          ctx.arc(g2x, g2y + 2, 1.2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();
    }
  }

  function drawQuokka() {
    var w = QUOKKA_W;
    var h = QUOKKA_H;
    var drawX = quokkaX - w / 2;
    var drawY = state === 'GAMEOVER' ? fallY : quokkaY;
    if (jumpProgress <= 0 && state !== 'GAMEOVER') {
      var dance = Math.sin(animTime * 4) * 2.5;
      var sway = Math.cos(animTime * 2.6) * 2;
      drawY += dance;
      drawX += sway;
    }
    if (jumpProgress > 0 && state !== 'GAMEOVER') {
      var t = 1 - jumpProgress / JUMP_DURATION;
      var fromX = jumpStartX - w / 2;
      var toX = quokkaX - w / 2;
      var fromY = jumpStartY;
      var toY = quokkaY;
      drawX = fromX + (toX - fromX) * t;
      drawY = fromY + (toY - fromY) * t - 18 * Math.sin(Math.PI * t);
      var dustOriginY = jumpStartY + h - 4;
      var dustOriginX = jumpStartX;
      for (var d = 0; d < 12; d++) {
        var angle = (d / 12) * Math.PI * 1.6 - Math.PI * 0.2 + (d % 3) * 0.3;
        var dist = 8 + t * 28 + Math.sin(d * 1.7) * 6;
        var dx = dustOriginX + Math.cos(angle) * dist;
        var dy = dustOriginY + Math.sin(angle) * dist * 0.6 + t * 12;
        var dustAlpha = 0.6 * (1 - t);
        var dustR = 1.5 + (1 - t) * 1.5;
        ctx.fillStyle = 'rgba(120,90,70,' + dustAlpha + ')';
        ctx.beginPath();
        ctx.arc(dx, dy, dustR, 0, Math.PI * 2);
        ctx.fill();
      }
      for (var d2 = 0; d2 < 8; d2++) {
        var a2 = (d2 / 8) * Math.PI * 2 + animTime * 2;
        var dist2 = 4 + t * 18 + (d2 % 2) * 4;
        var dx2 = dustOriginX + Math.cos(a2) * dist2;
        var dy2 = dustOriginY + t * 8 + Math.sin(a2) * dist2 * 0.4;
        ctx.fillStyle = 'rgba(90,70,50,' + (0.5 * (1 - t)) + ')';
        ctx.beginPath();
        ctx.arc(dx2, dy2, 1.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    var centerY = drawY + h / 2;
    var centerX = drawX + w / 2;
    var flipCenterX = (jumpProgress > 0 && state !== 'GAMEOVER') ? centerX : quokkaX;

    ctx.save();
    if (state === 'GAMEOVER') {
      ctx.translate(centerX, centerY);
      ctx.rotate(fallRotation);
      ctx.translate(-centerX, -centerY);
    }
    if (state !== 'GAMEOVER' && direction === -1) {
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

    // 게임 오버 시 말풍선 "이런~ 젠장"
    if (state === 'GAMEOVER' && fallY < CANVAS_HEIGHT + 80) {
      var Sb = GAME_SCALE;
      var bx = drawX + w / 2;
      var by = drawY - 8 * Sb;
      var bubbleW = 100 * Sb;
      var bubbleH = 32 * Sb;
      ctx.save();
      ctx.fillStyle = 'rgba(255,255,255,0.98)';
      ctx.strokeStyle = 'rgba(0,0,0,0.25)';
      ctx.lineWidth = 2;
      var br = 12 * Sb;
      var bleft = bx - bubbleW / 2;
      var btop = by - bubbleH;
      ctx.beginPath();
      ctx.moveTo(bleft + br, btop);
      ctx.lineTo(bleft + bubbleW - br, btop);
      ctx.arcTo(bleft + bubbleW, btop, bleft + bubbleW, btop + br, br);
      ctx.lineTo(bleft + bubbleW, btop + bubbleH - br);
      ctx.arcTo(bleft + bubbleW, btop + bubbleH, bleft + bubbleW - br, btop + bubbleH, br);
      ctx.lineTo(bleft + br, btop + bubbleH);
      ctx.arcTo(bleft, btop + bubbleH, bleft, btop + bubbleH - br, br);
      ctx.lineTo(bleft, btop + br);
      ctx.arcTo(bleft, btop, bleft + br, btop, br);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#333';
      ctx.font = 'bold ' + Math.round(15 * Sb) + 'px "Malgun Gothic", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(GAMEOVER_MESSAGE, bx, by - bubbleH / 2);
      ctx.restore();
    }
  }

  function drawUI() {
    var S = GAME_SCALE;
    var barH = Math.round(42 * S);
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, 0, CANVAS_WIDTH, barH);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold ' + Math.round(18 * S) + 'px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(floor + ' 층', 12 * S, barH / 2 + 4);
    ctx.textAlign = 'right';
    ctx.fillText('최고: ' + getHighScore() + ' 층', CANVAS_WIDTH - 12 * S, barH / 2 + 4);
    if (state === 'PLAYING') {
      ctx.textAlign = 'center';
      ctx.fillStyle = timeRemaining <= 10 ? '#ff6b6b' : '#fff';
      ctx.fillText('제한시간 ' + Math.ceil(timeRemaining) + '초', CANVAS_WIDTH / 2, barH / 2 + 4);
    }
  }

  function drawReadyOverlay() {
    var S = GAME_SCALE;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold ' + Math.round(24 * S) + 'px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('무한의 계단', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 50 * S);
    ctx.font = Math.round(16 * S) + 'px sans-serif';
    ctx.fillText('귀여운 쿼카와 함께!', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 20 * S);
    ctx.fillText('아래 [게임 시작하기] 버튼을 눌러 시작', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 20 * S);
    ctx.font = Math.round(13 * S) + 'px sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.fillText('A버튼: 방향전환', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 55 * S);
    ctx.fillText('Space버튼: 오르기', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 78 * S);
  }

  function drawGameOverOverlay() {
    var S = GAME_SCALE;
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold ' + Math.round(22 * S) + 'px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('게임 오버', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 50 * S);
    ctx.fillText(floor + ' 층 달성', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 15 * S);
    ctx.fillText('최고 기록: ' + getHighScore() + ' 층', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 20 * S);
    ctx.font = Math.round(14 * S) + 'px sans-serif';
    ctx.fillText('아래 [다시 시작하기] 버튼을 누르세요', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 55 * S);
  }

  function updateButtonVisibility() {
    var btnStart = document.getElementById('btnStart');
    var btnTurn = document.getElementById('btnTurn');
    var btnClimb = document.getElementById('btnClimb');
    var btnRestart = document.getElementById('btnRestart');
    var show = function (el, visible) { if (el) el.style.display = visible ? '' : 'none'; };
    if (state === 'READY') {
      show(btnStart, true);
      show(btnTurn, false);
      show(btnClimb, false);
      show(btnRestart, false);
    } else if (state === 'PLAYING') {
      show(btnStart, false);
      show(btnTurn, true);
      show(btnClimb, true);
      show(btnRestart, false);
    } else if (state === 'GAMEOVER') {
      show(btnStart, false);
      show(btnTurn, false);
      show(btnClimb, false);
      show(btnRestart, true);
    }
  }

  function loop(timestamp) {
    var dt = Math.min((timestamp - lastTime) / 1000, 0.1);
    lastTime = timestamp;
    animTime += dt;
    if (jumpProgress > 0) jumpProgress -= dt;
    if (state === 'PLAYING') {
      timeRemaining -= dt;
      if (timeRemaining <= 0) {
        timeRemaining = 0;
        gameOver();
      }
    }
    if (state === 'GAMEOVER') {
      fallVelY += 920 * dt;
      fallY += fallVelY * dt;
      fallRotation += (4 + fallVelY * 0.008) * dt;
    }

    drawBackground();
    drawGround();
    if (state === 'READY') drawStump();
    drawStairs();
    drawQuokka();
    drawUI();

    if (state === 'READY') drawReadyOverlay();
    else if (state === 'GAMEOVER') drawGameOverOverlay();

    requestAnimationFrame(loop);
  }

  function onTurnClick() {
    if (state === 'GAMEOVER') {
      initGame();
      startGame();
      return;
    }
    if (state !== 'PLAYING') return;
    turnWithJump();
  }

  function onClimbClick() {
    if (state === 'GAMEOVER') {
      initGame();
      startGame();
      return;
    }
    if (state !== 'PLAYING') return;
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

  function updateCanvasSize() {
    if (!canvas) return;
    var container = canvas.parentElement;
    var cw = (container && container.clientWidth > 0) ? container.clientWidth : (window.visualViewport ? window.visualViewport.width : window.innerWidth);
    var ch = (container && container.clientHeight > 0) ? container.clientHeight : (window.visualViewport ? window.visualViewport.height : window.innerHeight);
    if (cw <= 0) cw = document.documentElement.clientWidth || window.innerWidth || DESIGN_WIDTH;
    if (ch <= 0) ch = window.innerHeight || DESIGN_HEIGHT;
    var scale = Math.min(cw / DESIGN_WIDTH, ch / DESIGN_HEIGHT);
    var w = Math.max(200, Math.round(DESIGN_WIDTH * scale));
    var h = Math.max(400, Math.round(DESIGN_HEIGHT * scale));
    var sizeChanged = canvas.width !== w || canvas.height !== h;
    if (sizeChanged) {
      canvas.width = w;
      canvas.height = h;
    }
    CANVAS_WIDTH = w;
    CANVAS_HEIGHT = h;
    GAME_SCALE = scale;
    PADDING = Math.round(24 * scale);
    STAIR_WIDTH = Math.max(20, Math.round(56 * scale));
    STAIR_HEIGHT = Math.round(STAIR_WIDTH * 3 / 4);
    STEP_Y = STAIR_HEIGHT + Math.round(28 * scale);
    QUOKKA_W = Math.round(78 * scale);
    QUOKKA_H = Math.round(70 * scale);
    STUMP_HEIGHT = Math.round(65 * scale);
    STAIR_DEPTH = Math.round(STAIR_HEIGHT * 0.35);
    STAIR_RADIUS = Math.max(6, Math.min(14, Math.round(14 * scale)));
    GROUND_TOP = Math.round(CANVAS_HEIGHT * 0.88);
    STAIR0_Y = GROUND_TOP - STUMP_HEIGHT;
    if (sizeChanged && state === 'READY') {
      var pos = getStairPosition(0);
      quokkaX = getStairX(pos) + STAIR_WIDTH / 2;
      quokkaY = STAIR0_Y - QUOKKA_H + 3;
    }
  }

  function init() {
    canvas = document.getElementById('gameCanvas');
    if (!canvas) return;
    ctx = canvas.getContext('2d');
    updateCanvasSize();
    initGame();
    updateButtonVisibility();
    lastTime = performance.now();
    requestAnimationFrame(loop);

    function onResize() {
      requestAnimationFrame(function () {
        updateCanvasSize();
        if (state === 'READY') {
          var pos = getStairPosition(0);
          quokkaX = getStairX(pos) + STAIR_WIDTH / 2;
          quokkaY = STAIR0_Y - QUOKKA_H + 3;
        }
      });
    }
    window.addEventListener('resize', onResize);
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', onResize);
    }
    requestAnimationFrame(function () {
      updateCanvasSize();
      if (state === 'READY') {
        var pos = getStairPosition(0);
        quokkaX = getStairX(pos) + STAIR_WIDTH / 2;
        quokkaY = STAIR0_Y - QUOKKA_H + 3;
      }
    });

    var btnStart = document.getElementById('btnStart');
    var btnTurn = document.getElementById('btnTurn');
    var btnClimb = document.getElementById('btnClimb');
    var btnRestart = document.getElementById('btnRestart');
    if (btnStart) btnStart.addEventListener('click', function () { if (state === 'READY') startGame(); });
    if (btnTurn) btnTurn.addEventListener('click', onTurnClick);
    if (btnClimb) btnClimb.addEventListener('click', onClimbClick);
    if (btnRestart) btnRestart.addEventListener('click', function () { if (state === 'GAMEOVER') { initGame(); startGame(); } });

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
