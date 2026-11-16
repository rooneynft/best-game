// Cometfall — bootstrap: sizes the canvas, wires the game, the renderer and
// the input together, and runs the frame loop on a fixed timestep so the
// physics plays the same on any display.
//
// Screenshot staging: ?shot=start shows the title, ?shot=play a mid-flight
// moment, ?shot=win the level-clear panel and ?shot=lose the out-of-launches
// panel. ?seed= changes the decoration seed (the game itself is fixed).
import { Game } from './game.js';
import { Renderer } from './render.js';
import { Input } from './input.js';

const canvas = document.getElementById('game');
const status = document.getElementById('status');

const game = new Game();
const renderer = new Renderer(canvas);
const input = new Input(canvas, game);
game.input = input;
game.renderer = renderer;
// Exposed for play-testing from the console and for the screenshot script.
window.__cometfall = game;

function resize() {
  renderer.resize();
  document.title = 'Cometfall — a gravity-slingshot star hunt';
}
window.addEventListener('resize', resize);
resize();

// Announce state changes for screen readers.
let lastAnnounced = '';
function announce() {
  const text = {
    title: 'Cometfall. Press Enter to play.',
    aim: `Level ${game.levelIndex + 1}. ${game.starsLeft.length} stars left, ${game.launchesLeft} launches left. Score ${game.score}.`,
    levelComplete: `Level clear! Score ${game.score}. Press Enter for the next level.`,
    levelFailed: 'Out of launches. Press Enter to retry the level.',
    victory: `You caught every star! Final score ${game.score}. Press Enter to play again.`,
    paused: 'Paused.',
  }[game.state];
  if (text && text !== lastAnnounced) {
    lastAnnounced = text;
    status.textContent = text;
  }
}

// Stage a screenshot scene when the URL asks for one.
const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
if (shot) game.applyShot(shot);

// Fixed-timestep loop: physics at 120 Hz in small steps, rendering each
// animation frame.
let last = performance.now();
let accumulator = 0;
const STEP = 1 / 120;
function frame(now) {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  accumulator += dt;
  while (accumulator >= STEP) {
    game.update(STEP);
    accumulator -= STEP;
  }
  renderer.draw(game, game.time);
  announce();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
