import { CANVAS, STATE } from './constants.js';
import * as stairs from './stairs.js';
import * as quokka from './quokka.js';
import * as game from './game.js';

/**
 * 귀여운 쿼카 그리기 (원·타원으로 얼굴+몸)
 */
function drawQuokka(ctx) {
  const q = quokka.getQuokka();
  const cx = q.x;
  const cy = q.y + q.height / 2;
  const w = q.width;
  const h = q.height;

  ctx.save();

  // 몸 (갈색 타원)
  ctx.fillStyle = '#c4a574';
  ctx.beginPath();
  ctx.ellipse(cx, cy, w * 0.45, h * 0.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#a08050';
  ctx.lineWidth = 2;
  ctx.stroke();

  // 얼굴 밝은 부분 (배쪽)
  ctx.fillStyle = '#e8d4b8';
  ctx.beginPath();
  ctx.ellipse(cx - w * 0.15, cy + h * 0.1, w * 0.25, h * 0.35, 0, 0, Math.PI * 2);
  ctx.fill();

  // 왼쪽 귀
  ctx.fillStyle = '#c4a574';
  ctx.beginPath();
  ctx.ellipse(cx - w * 0.35, cy - h * 0.35, w * 0.12, h * 0.2, -0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // 오른쪽 귀
  ctx.beginPath();
  ctx.ellipse(cx + w * 0.35, cy - h * 0.35, w * 0.12, h * 0.2, 0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // 왼쪽 눈
  ctx.fillStyle = '#2c2c2c';
  ctx.beginPath();
  ctx.arc(cx - w * 0.18, cy - h * 0.15, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(cx - w * 0.19, cy - h * 0.18, 2, 0, Math.PI * 2);
  ctx.fill();

  // 오른쪽 눈
  ctx.fillStyle = '#2c2c2c';
  ctx.beginPath();
  ctx.arc(cx + w * 0.18, cy - h * 0.15, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(cx + w * 0.17, cy - h * 0.18, 2, 0, Math.PI * 2);
  ctx.fill();

  // 미소 입
  ctx.strokeStyle = '#5c4a32';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy + h * 0.1, w * 0.15, 0.2 * Math.PI, 0.8 * Math.PI);
  ctx.stroke();

  ctx.restore();
}

function drawStairs(ctx) {
  const list = stairs.getStairs();
  list.forEach((s) => {
    ctx.fillStyle = '#6b5b4f';
    ctx.fillRect(s.x, s.y, s.width, s.height);
    ctx.strokeStyle = '#8b7b6f';
    ctx.lineWidth = 2;
    ctx.strokeRect(s.x, s.y, s.width, s.height);
    ctx.fillStyle = '#7a6a5e';
    ctx.fillRect(s.x + 2, s.y + 2, s.width - 4, 4);
  });
}

function drawBackground(ctx) {
  const g = ctx.createLinearGradient(0, 0, 0, CANVAS.HEIGHT);
  g.addColorStop(0, '#87ceeb');
  g.addColorStop(1, '#b0e0e6');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, CANVAS.WIDTH, CANVAS.HEIGHT);
}

export function render(ctx) {
  if (!ctx) return;
  drawBackground(ctx);
  drawStairs(ctx);
  drawQuokka(ctx);
}

export function renderUI(ctx, state, score, highScore) {
  if (!ctx) return;
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.font = 'bold 24px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`점수: ${score}`, 12, 32);
  ctx.fillText(`최고: ${highScore}`, 12, 58);
}

export function renderReadyOverlay(ctx) {
  if (!ctx) return;
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(0, 0, CANVAS.WIDTH, CANVAS.HEIGHT);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 28px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('🐹 무한의 계단', CANVAS.WIDTH / 2, CANVAS.HEIGHT / 2 - 40);
  ctx.font = '18px sans-serif';
  ctx.fillText('← → 키로 이동', CANVAS.WIDTH / 2, CANVAS.HEIGHT / 2);
  ctx.fillText('시작하려면 스페이스 또는 클릭', CANVAS.WIDTH / 2, CANVAS.HEIGHT / 2 + 36);
}

export function renderGameOverOverlay(ctx, score, highScore) {
  if (!ctx) return;
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(0, 0, CANVAS.WIDTH, CANVAS.HEIGHT);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 26px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('게임 오버', CANVAS.WIDTH / 2, CANVAS.HEIGHT / 2 - 50);
  ctx.font = '20px sans-serif';
  ctx.fillText(`점수: ${score}`, CANVAS.WIDTH / 2, CANVAS.HEIGHT / 2 - 10);
  ctx.fillText(`최고 기록: ${highScore}`, CANVAS.WIDTH / 2, CANVAS.HEIGHT / 2 + 24);
  ctx.font = '16px sans-serif';
  ctx.fillText('다시 하기: 스페이스 또는 클릭', CANVAS.WIDTH / 2, CANVAS.HEIGHT / 2 + 60);
}
