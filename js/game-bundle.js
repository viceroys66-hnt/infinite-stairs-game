/**
 * 무한의 계단 (쿼카 버전) - 나무위키 규칙 반영
 * 오르기/방향전환 버튼, 체력 게이지, 지그재그 계단
 * ES 모듈 없이 file:// 에서도 동작
 */
(function () {
  'use strict';

  var CANVAS_WIDTH = 393;
  var CANVAS_HEIGHT = 852;
  var GROUND_TOP = Math.round(CANVAS_HEIGHT * 0.88);
  var STUMP_HEIGHT = 65;
  var STAIR0_Y = GROUND_TOP - STUMP_HEIGHT;
  var DESIGN_WIDTH = 393;
  var DESIGN_HEIGHT = 852;
  var STAIR_WIDTH = 56;
  var STAIR_HEIGHT = Math.round(STAIR_WIDTH * 3 / 4);
  var STEP_Y = STAIR_HEIGHT + 28;
  var QUOKKA_W = 78;
  var QUOKKA_H = 70;
  var QUOKKA_STAND_OFFSET = 5;
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
  var canvas, ctx;
  var quokkaImg = new Image();
  quokkaImg.src = 'assets/quokka.png';
  var stumpImg = new Image();
  stumpImg.src = 'assets/stump.png';
  var stairImg = new Image();
  stairImg.src = 'assets/stair.png';
  var birdImg = new Image();
  birdImg.src = 'assets/bird.png';

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
    return STAIR0_Y + (floor - floorIndex) * STEP_Y;
  }

  function initGame() {
    state = 'READY';
    floor = 0;
    direction = 1;
    jumpProgress = 0;
    fallVelY = 0;
    buildRandomZigzag();
    var pos = getStairPosition(0);
    quokkaX = getStairX(pos) + STAIR_WIDTH / 2;
    quokkaY = STAIR0_Y - QUOKKA_H + 3;
    scrollOffset = 0;
  }

  function startGame() {
    if (state !== 'READY') return;
    state = 'PLAYING';
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
    // 밝은 하늘 그라데이션 (전체적으로 밝게)
    var skyG = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
    skyG.addColorStop(0, '#5a9fd4');
    skyG.addColorStop(0.3, '#7bb8e8');
    skyG.addColorStop(0.6, '#9cccf0');
    skyG.addColorStop(1, '#c5e4fa');
    ctx.fillStyle = skyG;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    var t = animTime * 0.4;

    function drawPuffyCloud(centerX, centerY, scale, opacity, isFar) {
      var blobs = isFar
        ? [[0, 0, 1, 0.5], [0.5, -0.15, 0.7, 0.4], [0.25, 0.2, 0.55, 0.35], [-0.2, 0.1, 0.45, 0.38]]
        : [[0, 0, 1, 0.55], [0.55, -0.2, 0.75, 0.45], [0.3, 0.25, 0.6, 0.4], [-0.25, 0.05, 0.5, 0.42], [0.15, 0.35, 0.45, 0.35]];
      var b, bx, by, rw, rh, grad;
      if (isFar) {
        for (b = 0; b < blobs.length; b++) {
          bx = centerX + blobs[b][0] * scale * 55;
          by = centerY + blobs[b][1] * scale * 45;
          rw = blobs[b][2] * scale * 48;
          rh = blobs[b][3] * scale * 28;
          ctx.fillStyle = 'rgba(255,255,255,' + (opacity * 0.5) + ')';
          ctx.beginPath();
          ctx.ellipse(bx, by, rw, rh, 0, 0, Math.PI * 2);
          ctx.fill();
        }
        return;
      }
      for (b = 0; b < blobs.length; b++) {
        bx = centerX + blobs[b][0] * scale * 55;
        by = centerY + blobs[b][1] * scale * 45;
        rw = blobs[b][2] * scale * 48;
        rh = blobs[b][3] * scale * 28;
        grad = ctx.createRadialGradient(bx - rw * 0.4, by - rh * 0.45, 0, bx + rw * 0.25, by + rh * 0.3, rw * 1.2);
        grad.addColorStop(0, 'rgba(255,255,255,' + (opacity * 0.98) + ')');
        grad.addColorStop(0.35, 'rgba(255,255,255,' + (opacity * 0.9) + ')');
        grad.addColorStop(0.6, 'rgba(248,252,255,' + (opacity * 0.78) + ')');
        grad.addColorStop(0.82, 'rgba(235,248,255,' + (opacity * 0.58) + ')');
        grad.addColorStop(1, 'rgba(218,238,250,' + (opacity * 0.38) + ')');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.ellipse(bx, by, rw, rh, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 먼 구름 (뭉게뭉게, 흐릿한 레이어)
    for (var i = 0; i < 5; i++) {
      var fx = ((i * 115 + t * 5) % (CANVAS_WIDTH + 200)) - 100;
      var fy = 60 + (i % 3) * 95 + Math.sin(t + i * 0.7) * 15;
      drawPuffyCloud(fx, fy, 0.85 + (i % 3) * 0.15, 0.48, true);
    }

    // 가까운 구름 (뭉게뭉게 + 3D 그라데이션)
    for (var j = 0; j < 6; j++) {
      var cx = ((j * 88 + t * 9) % (CANVAS_WIDTH + 160)) - 80;
      var cy = 130 + (j % 3) * 90 + Math.sin(t * 1.1 + j * 1.3) * 20;
      drawPuffyCloud(cx, cy, 1 + (j % 2) * 0.2, 0.9, false);
    }

    // 하늘만 (올라가는 느낌 – 바닥/땅 없음)
    var horizonG = ctx.createLinearGradient(0, CANVAS_HEIGHT * 0.4, 0, CANVAS_HEIGHT);
    horizonG.addColorStop(0, 'rgba(255,255,255,0)');
    horizonG.addColorStop(0.6, 'rgba(255,252,248,0.12)');
    horizonG.addColorStop(1, 'rgba(230,245,255,0.25)');
    ctx.fillStyle = horizonG;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // 참새 (날개짓하며 날아다니는 작은 새)
    for (var bird = 0; bird < 3; bird++) {
      var btx = ((bird * 180 + t * 45) % (CANVAS_WIDTH + 100)) - 50;
      var bty = 100 + (bird % 3) * 120 + Math.sin(t * 2 + bird) * 25;
      var wingPhase = Math.sin(t * 14 + bird * 2.1);
      var wingY = wingPhase * 9;
      ctx.save();
      ctx.translate(btx, bty);
      if (birdImg.complete && birdImg.naturalWidth > 0) {
        var flapScale = 1 + 0.14 * wingPhase;
        var bw = 28;
        var bh = 18;
        ctx.scale(1, flapScale);
        ctx.drawImage(birdImg, -bw / 2, -bh / 2, bw, bh);
      } else {
        var bodyG = ctx.createRadialGradient(-2, -1, 0, 0, 0, 12);
        bodyG.addColorStop(0, '#8b7355');
        bodyG.addColorStop(0.6, '#6b5344');
        bodyG.addColorStop(1, '#4a3c32');
        ctx.fillStyle = bodyG;
        ctx.beginPath();
        ctx.ellipse(0, 0, 11, 7, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.15)';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.fillStyle = '#2c2c2c';
        ctx.beginPath();
        ctx.ellipse(6, 0, 2.5, 2.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#c45c38';
        ctx.beginPath();
        ctx.moveTo(9, 0);
        ctx.lineTo(15, -1.5);
        ctx.lineTo(15, 1.5);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = 'rgba(90,70,55,0.9)';
        ctx.beginPath();
        ctx.moveTo(-5, 0);
        ctx.lineTo(-15, -4 - wingY);
        ctx.lineTo(-7, 0);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(-5, 0);
        ctx.lineTo(-15, 4 + wingY);
        ctx.lineTo(-7, 0);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    }

    // 풍선 (날아다니는 풍선)
    for (var bal = 0; bal < 4; bal++) {
      var bax = ((bal * 140 + t * 18) % (CANVAS_WIDTH + 120)) - 60;
      var bay = 150 + (bal % 2) * 130 + Math.sin(t * 1.3 + bal * 2) * 22;
      var balColors = ['#e74c3c', '#f1c40f', '#3498db', '#9b59b6'];
      var balG = ctx.createRadialGradient(bax - 3, bay - 3, 0, bax, bay, 22);
      balG.addColorStop(0, 'rgba(255,255,255,0.45)');
      balG.addColorStop(0.5, balColors[bal % 4]);
      balG.addColorStop(1, balColors[bal % 4]);
      ctx.fillStyle = balG;
      ctx.beginPath();
      ctx.ellipse(bax, bay, 16, 20, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.12)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(bax - 3, bay + 20);
      ctx.lineTo(bax, bay + 32);
      ctx.lineTo(bax + 3, bay + 20);
      ctx.fillStyle = balColors[bal % 4];
      ctx.fill();
      ctx.stroke();
    }
  }

  var STAIR_DEPTH = Math.round(STAIR_HEIGHT * 0.35);
  var STAIR_RADIUS = 14; // 동글동글한 모서리

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
    var stumpW = 116;
    var grassHeight = CANVAS_HEIGHT - gTop + 60;
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
    for (var g = 0; g < 55; g++) {
      var gx = (g * 37 + Math.floor(animTime * 2) % 80) % (CANVAS_WIDTH + 60) - 30;
      var gy = gTop + 10 + (g % 6) * 18 + (g % 4) * 6;
      if (gy > CANVAS_HEIGHT + 10) continue;
      if (state === 'READY' && floor === 0) {
        var distFromStump = Math.abs(gx - stumpCx);
        if (distFromStump < stumpW / 2 + 25 && gy < gTop + 50) continue;
      }
      var bladeG = ctx.createLinearGradient(gx - 4, gy, gx + 4, gy + 10);
      bladeG.addColorStop(0, 'rgba(70,120,60,0.9)');
      bladeG.addColorStop(1, 'rgba(50,90,45,0.95)');
      ctx.fillStyle = bladeG;
      ctx.beginPath();
      ctx.moveTo(gx, gy + 8);
      ctx.lineTo(gx - 3, gy);
      ctx.lineTo(gx + 1, gy + 6);
      ctx.closePath();
      ctx.fill();
    }
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    function drawTree(tx, baseY, scale) {
      var trunkH = 42 * scale;
      var trunkW = 8 * scale;
      var foliageR = 28 * scale;
      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,0.2)';
      ctx.shadowBlur = 4;
      ctx.shadowOffsetY = 2;
      ctx.fillStyle = '#5c4033';
      ctx.fillRect(tx - trunkW / 2, baseY - trunkH, trunkW, trunkH);
      var foliageG = ctx.createRadialGradient(tx - foliageR * 0.3, baseY - trunkH - foliageR * 0.4, 0, tx, baseY - trunkH, foliageR);
      foliageG.addColorStop(0, '#6b9e5c');
      foliageG.addColorStop(0.5, '#4a7c3d');
      foliageG.addColorStop(1, '#3d6b32');
      ctx.fillStyle = foliageG;
      ctx.beginPath();
      ctx.ellipse(tx, baseY - trunkH - foliageR * 0.3, foliageR, foliageR * 1.1, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(tx - foliageR * 0.4, baseY - trunkH - foliageR * 0.6, foliageR * 0.7, foliageR * 0.85, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(tx + foliageR * 0.35, baseY - trunkH - foliageR * 0.5, foliageR * 0.75, foliageR * 0.9, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.restore();
    }
    var treeBaseY = gTop + 8 + Math.floor(animTime * 0.5) % 4;
    drawTree(28, treeBaseY, 1);
    drawTree(62, treeBaseY + 12, 0.85);
    drawTree(95, treeBaseY - 5, 1.1);
    drawTree(CANVAS_WIDTH - 28, treeBaseY + 5, 0.9);
    drawTree(CANVAS_WIDTH - 65, treeBaseY - 8, 1.05);
    drawTree(CANVAS_WIDTH - 98, treeBaseY + 8, 0.8);
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
    if (state !== 'GAMEOVER' && (state === 'READY' || direction === -1)) {
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
      var bx = drawX + w / 2;
      var by = drawY - 8;
      var bubbleW = 100;
      var bubbleH = 32;
      ctx.save();
      ctx.fillStyle = 'rgba(255,255,255,0.98)';
      ctx.strokeStyle = 'rgba(0,0,0,0.25)';
      ctx.lineWidth = 2;
      var br = 12;
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
      ctx.font = 'bold 15px "Malgun Gothic", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(GAMEOVER_MESSAGE, bx, by - bubbleH / 2);
      ctx.restore();
    }
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
    ctx.fillText('아래 [게임 시작하기] 버튼을 눌러 시작', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 20);
  }

  function drawGameOverOverlay() {
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 22px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('게임 오버', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 50);
    ctx.fillText(floor + ' 층 달성', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 15);
    ctx.fillText('최고 기록: ' + getHighScore() + ' 층', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 20);
    ctx.font = '14px sans-serif';
    ctx.fillText('아래 [다시 시작하기] 버튼을 누르세요', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 55);
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
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
      CANVAS_WIDTH = w;
      CANVAS_HEIGHT = h;
      GROUND_TOP = Math.round(CANVAS_HEIGHT * 0.88);
      STAIR0_Y = GROUND_TOP - STUMP_HEIGHT;
      if (state === 'READY') {
        var pos = getStairPosition(0);
        quokkaX = getStairX(pos) + STAIR_WIDTH / 2;
        quokkaY = STAIR0_Y - QUOKKA_H + 3;
      }
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
