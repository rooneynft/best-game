// Cometfall — keyboard and pointer input. The canvas letterboxes the world,
// so screen pixels are converted back to world coordinates with the same
// scale and offset the renderer uses.
import { WORLD_H, WORLD_W } from './config.js';

// The view transform the renderer computes each frame: scale + offset.
export function computeView(canvas) {
  const scale = Math.min(canvas.width / WORLD_W, canvas.height / WORLD_H);
  const offsetX = (canvas.width - WORLD_W * scale) / 2;
  const offsetY = (canvas.height - WORLD_H * scale) / 2;
  return { scale, offsetX, offsetY };
}

export class Input {
  constructor(canvas, game) {
    this.canvas = canvas;
    this.game = game;
    this.dragging = false;
    this.dragStart = { x: 0, y: 0 };
    this.dragNow = { x: 0, y: 0 };
    this.hover = { x: 0, y: 0 };

    canvas.addEventListener('pointerdown', (e) => this.onDown(e));
    canvas.addEventListener('pointermove', (e) => this.onMove(e));
    canvas.addEventListener('pointerup', (e) => this.onUp(e));
    canvas.addEventListener('pointercancel', () => this.cancelDrag());
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    window.addEventListener('keydown', (e) => this.onKey(e));
    window.addEventListener('blur', () => this.cancelDrag());
  }

  toWorld(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    const { scale, offsetX, offsetY } = computeView(this.canvas);
    // Canvas backing pixels vs CSS pixels: the canvas is sized to the
    // window in device pixels, so scale by the rect ratio first.
    const px = ((clientX - rect.left) / rect.width) * this.canvas.width;
    const py = ((clientY - rect.top) / rect.height) * this.canvas.height;
    return { x: (px - offsetX) / scale, y: (py - offsetY) / scale };
  }

  onDown(e) {
    const p = this.toWorld(e.clientX, e.clientY);
    this.game.sounds.unlock();
    // Buttons on the overlay screens get the click first.
    if (this.game.clickButton(p.x, p.y)) return;
    if (this.game.state === 'aim') {
      this.dragging = true;
      this.dragStart = p;
      this.dragNow = p;
    }
  }

  onMove(e) {
    const p = this.toWorld(e.clientX, e.clientY);
    this.hover = p;
    if (this.dragging) this.dragNow = p;
  }

  onUp(e) {
    if (!this.dragging) return;
    this.dragging = false;
    const p = this.toWorld(e.clientX, e.clientY);
    this.game.releaseDrag(this.dragStart, p);
  }

  cancelDrag() {
    this.dragging = false;
  }

  onKey(e) {
    if (e.repeat) return;
    const key = e.key.toLowerCase();
    if (key === ' ') e.preventDefault();
    this.game.sounds.unlock();
    if (key === 'm') {
      this.game.toggleMute();
      return;
    }
    this.game.pressKey(key);
  }
}
