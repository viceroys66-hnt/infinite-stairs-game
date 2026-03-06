import { CANVAS, STATE } from './constants.js';
import * as game from './game.js';
import * as quokka from './quokka.js';
import * as render from './render.js';

let canvas;
let ctx;
let lastTime = 0;
let keys = { ArrowLeft: false, ArrowRight: false };

function getCanvas() {
  return document.getElementById('gameCanvas');
}

function loop(timestamp) {
  const dt = Math.min((timestamp - lastTime) / 1000, 0.1);
  lastTime = timestamp;

  if (game.getState() === STATE.PLAYING) {
    if (keys.ArrowLeft) quokka.moveLeft(dt);
    if (keys.ArrowRight) quokka.moveRight(dt);
    game.tick(dt);
  }

  ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, CANVAS.WIDTH, CANVAS.HEIGHT);
  render.render(ctx);
  render.renderUI(ctx, game.getState(), game.getScore(), game.getHighScore());

  if (game.getState() === STATE.READY) {
    render.renderReadyOverlay(ctx);
  } else if (game.getState() === STATE.GAMEOVER) {
    render.renderGameOverOverlay(ctx, game.getScore(), game.getHighScore());
  }

  requestAnimationFrame(loop);
}

function onKeyDown(e) {
  if (e.key === 'ArrowLeft') keys.ArrowLeft = true;
  if (e.key === 'ArrowRight') keys.ArrowRight = true;
  if (e.key === ' ') {
    e.preventDefault();
    if (game.getState() === STATE.READY) {
      game.start();
    } else if (game.getState() === STATE.GAMEOVER) {
      game.init();
      game.start();
    }
  }
}

function onKeyUp(e) {
  if (e.key === 'ArrowLeft') keys.ArrowLeft = false;
  if (e.key === 'ArrowRight') keys.ArrowRight = false;
}

function onClick() {
  if (game.getState() === STATE.READY) {
    game.start();
  } else if (game.getState() === STATE.GAMEOVER) {
    game.init();
    game.start();
  }
}

function init() {
  canvas = getCanvas();
  if (!canvas) return;
  canvas.width = CANVAS.WIDTH;
  canvas.height = CANVAS.HEIGHT;
  game.init();
  lastTime = performance.now();
  requestAnimationFrame(loop);
  document.addEventListener('keydown', onKeyDown);
  document.addEventListener('keyup', onKeyUp);
  canvas.addEventListener('click', onClick);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
