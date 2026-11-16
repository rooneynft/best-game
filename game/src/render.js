// Cometfall — everything drawn on the canvas: the starfield, nebulae,
// planets, rocks, stars, the comet and its trail, the aim preview, the HUD
// and the overlay screens (title, level complete, level failed, victory,
// pause). All coordinates are world coordinates; the renderer letterboxes
// the 1280 x 720 world into the canvas.
import {
  COLORS,
  COMET_RADIUS,
  PLANET_PALETTES,
  WORLD_H,
  WORLD_W,
} from './config.js';
import { bodyPosition } from './physics.js';
import { mulberry32 } from './random.js';
import { computeView } from './input.js';

// Precomputed decoration, seeded so every load — and every screenshot —
// looks the same.
const rng = mulberry32(20261116);
const STARFIELD = [];
for (let layer = 0; layer < 3; layer++) {
  const stars = [];
  const count = [90, 60, 35][layer];
  for (let i = 0; i < count; i++) {
    stars.push({
      x: rng() * WORLD_W,
      y: rng() * WORLD_H,
      r: 0.6 + rng() * (layer === 2 ? 1.6 : 1.0),
      tw: rng() * Math.PI * 2,
      speed: 0.4 + rng() * 1.2,
    });
  }
  STARFIELD.push(stars);
}
const NEBULAE = [
  { x: 260, y: 180, r: 340, color: 'rgba(88, 60, 180, 0.20)' },
  { x: 1020, y: 540, r: 380, color: 'rgba(20, 120, 140, 0.16)' },
  { x: 1080, y: 130, r: 260, color: 'rgba(190, 60, 110, 0.13)' },
  { x: 180, y: 600, r: 280, color: 'rgba(40, 80, 200, 0.12)' },
];
// Rock silhouettes: one seeded jagged polygon per rock, keyed by index.
const ROCK_SHAPES = [];
for (let i = 0; i < 24; i++) {
  const pts = [];
  const n = 9;
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2;
    const rr = 0.72 + rng() * 0.4;
    pts.push({ a, rr });
  }
  ROCK_SHAPES.push(pts);
}

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.shake = 0; // decaying screen shake, in pixels
  }

  addShake(amount) {
    this.shake = Math.max(this.shake, amount);
  }

  resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    this.canvas.width = Math.floor(window.innerWidth * dpr);
    this.canvas.height = Math.floor(window.innerHeight * dpr);
  }

  draw(game, time) {
    const ctx = this.ctx;
    const view = computeView(this.canvas);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#02030a';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.setTransform(view.scale, 0, 0, view.scale, view.offsetX, view.offsetY);
    if (this.shake > 0.2) {
      const s = this.shake;
      ctx.translate((Math.random() - 0.5) * s, (Math.random() - 0.5) * s);
      this.shake *= 0.86;
    }

    this.drawBackground(ctx, time);
    const level = game.level;
    if (level) {
      this.drawPlanets(ctx, level, game.levelTime);
      this.drawRocks(ctx, level, game.levelTime);
      this.drawStars(ctx, game.starsLeft, time);
      if (game.state === 'aim' || game.state === 'flying') {
        this.drawComet(ctx, game);
      }
      if (game.state === 'aim') this.drawAim(ctx, game);
    }
    this.drawParticles(ctx, game.particles);
    this.drawFloaters(ctx, game.floaters);

    ctx.setTransform(view.scale, 0, 0, view.scale, view.offsetX, view.offsetY);
    if (game.state !== 'title') this.drawHud(ctx, game);
    if (game.state === 'title') this.drawTitle(ctx, game, time);
    if (game.state === 'levelComplete') this.drawLevelComplete(ctx, game);
    if (game.state === 'levelFailed') this.drawLevelFailed(ctx, game);
    if (game.state === 'victory') this.drawVictory(ctx, game, time);
    if (game.state === 'paused') this.drawPaused(ctx, game);
    if (game.hint) this.drawHint(ctx, game);
  }

  drawBackground(ctx, time) {
    const grad = ctx.createLinearGradient(0, 0, 0, WORLD_H);
    grad.addColorStop(0, COLORS.backgroundTop);
    grad.addColorStop(1, COLORS.backgroundBottom);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, WORLD_W, WORLD_H);
    for (const n of NEBULAE) {
      const g = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r);
      g.addColorStop(0, n.color);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(n.x - n.r, n.y - n.r, n.r * 2, n.r * 2);
    }
    for (let layer = 0; layer < STARFIELD.length; layer++) {
      for (const s of STARFIELD[layer]) {
        const tw = 0.45 + 0.55 * Math.abs(Math.sin(time * s.speed + s.tw));
        ctx.globalAlpha = tw * (0.35 + layer * 0.25);
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }

  drawPlanets(ctx, level, t) {
    level.planets.forEach((planet, i) => {
      const p = bodyPosition(planet, t);
      const pal = PLANET_PALETTES[planet.palette % PLANET_PALETTES.length];
      if (planet.orbit) {
        ctx.strokeStyle = 'rgba(160, 190, 255, 0.18)';
        ctx.setLineDash([4, 8]);
        ctx.beginPath();
        ctx.arc(planet.orbit.cx, planet.orbit.cy, planet.orbit.radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      const glow = ctx.createRadialGradient(p.x, p.y, planet.r * 0.4, p.x, p.y, planet.r * 2.1);
      glow.addColorStop(0, pal.glow + '55');
      glow.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(p.x, p.y, planet.r * 2.1, 0, Math.PI * 2);
      ctx.fill();
      const body = ctx.createRadialGradient(
        p.x - planet.r * 0.35, p.y - planet.r * 0.4, planet.r * 0.1,
        p.x, p.y, planet.r,
      );
      body.addColorStop(0, pal.body);
      body.addColorStop(1, pal.dark);
      ctx.fillStyle = body;
      ctx.beginPath();
      ctx.arc(p.x, p.y, planet.r, 0, Math.PI * 2);
      ctx.fill();
      // Ring for the big planets, like a gas giant.
      if (planet.r >= 70) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, planet.r * 1.55, planet.r * 0.42, -0.35, 0, Math.PI * 2);
        ctx.stroke();
      }
      // A few craters, seeded per planet.
      const crng = mulberry32(1000 + i * 77);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.18)';
      for (let k = 0; k < 4; k++) {
        const a = crng() * Math.PI * 2;
        const d = crng() * planet.r * 0.55;
        const cr = planet.r * (0.1 + crng() * 0.14);
        ctx.beginPath();
        ctx.arc(p.x + Math.cos(a) * d, p.y + Math.sin(a) * d, cr, 0, Math.PI * 2);
        ctx.fill();
      }
    });
  }

  drawRocks(ctx, level, t) {
    level.rocks.forEach((rock, i) => {
      const p = bodyPosition(rock, t);
      const shape = ROCK_SHAPES[i % ROCK_SHAPES.length];
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.beginPath();
      shape.forEach((pt, k) => {
        const x = Math.cos(pt.a) * rock.r * pt.rr;
        const y = Math.sin(pt.a) * rock.r * pt.rr;
        if (k === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.closePath();
      ctx.fillStyle = '#4a4238';
      ctx.fill();
      ctx.strokeStyle = '#8a7a66';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = 'rgba(255, 90, 90, 0.25)';
      ctx.beginPath();
      ctx.arc(0, 0, rock.r * 0.45, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }

  drawStars(ctx, starsLeft, time) {
    for (const star of starsLeft) {
      const pulse = 1 + 0.12 * Math.sin(time * 2.4 + star.x * 0.01);
      const r = 20 * pulse;
      ctx.save();
      ctx.translate(star.x, star.y);
      ctx.rotate(Math.sin(time * 0.8 + star.y * 0.01) * 0.25);
      const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 2.6);
      glow.addColorStop(0, 'rgba(255, 190, 60, 0.5)');
      glow.addColorStop(1, 'rgba(255, 190, 60, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(0, 0, r * 2.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = COLORS.starGold;
      ctx.strokeStyle = COLORS.starGlow;
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let k = 0; k < 10; k++) {
        const a = (k / 10) * Math.PI * 2 - Math.PI / 2;
        const rr = k % 2 === 0 ? r : r * 0.45;
        const x = Math.cos(a) * rr;
        const y = Math.sin(a) * rr;
        if (k === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
  }

  drawComet(ctx, game) {
    const c = game.comet;
    // Trail: a fading ribbon through the last positions.
    const trail = game.trail;
    if (trail.length > 1) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 1; i < trail.length; i++) {
        const f = i / trail.length;
        ctx.strokeStyle = `rgba(127, 231, 255, ${(f * 0.55).toFixed(3)})`;
        ctx.lineWidth = 2 + f * 7;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(trail[i - 1].x, trail[i - 1].y);
        ctx.lineTo(trail[i].x, trail[i].y);
        ctx.stroke();
      }
      ctx.restore();
    }
    const glow = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, 42);
    glow.addColorStop(0, 'rgba(190, 245, 255, 0.9)');
    glow.addColorStop(0.35, 'rgba(127, 231, 255, 0.35)');
    glow.addColorStop(1, 'rgba(127, 231, 255, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(c.x, c.y, 42, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = COLORS.cometCore;
    ctx.beginPath();
    ctx.arc(c.x, c.y, COMET_RADIUS, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = COLORS.cometGlow;
    ctx.beginPath();
    ctx.arc(c.x, c.y, COMET_RADIUS * 0.55, 0, Math.PI * 2);
    ctx.fill();
  }

  drawAim(ctx, game) {
    const input = game.input;
    if (!input.dragging) {
      // Idle: a gentle pulsing ring invites the player to drag.
      const pulse = 26 + 5 * Math.sin(game.time * 3);
      ctx.strokeStyle = 'rgba(127, 231, 255, 0.6)';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 8]);
      ctx.beginPath();
      ctx.arc(game.comet.x, game.comet.y, pulse, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      return;
    }
    const start = game.comet;
    const dx = input.dragStart.x - input.dragNow.x;
    const dy = input.dragStart.y - input.dragNow.y;
    const dragLen = Math.hypot(dx, dy);
    // Slingshot band from the comet to the drag point.
    ctx.strokeStyle = 'rgba(234, 242, 255, 0.5)';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 6]);
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(input.dragNow.x, input.dragNow.y);
    ctx.stroke();
    ctx.setLineDash([]);
    if (dragLen > 4) {
      const v = game.dragVelocity(input.dragStart, input.dragNow);
      const path = game.previewFor(v);
      ctx.fillStyle = 'rgba(127, 231, 255, 0.85)';
      for (let i = 0; i < path.length; i += 3) {
        ctx.globalAlpha = 0.85 * (1 - i / path.length) + 0.1;
        ctx.beginPath();
        ctx.arc(path[i].x, path[i].y, 3, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      // Arrowhead at the launch direction.
      const ang = Math.atan2(v.y, v.x);
      ctx.strokeStyle = '#7fe7ff';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(start.x + Math.cos(ang) * 26, start.y + Math.sin(ang) * 26);
      ctx.lineTo(start.x + Math.cos(ang) * 44, start.y + Math.sin(ang) * 44);
      ctx.stroke();
    }
  }

  drawParticles(ctx, particles) {
    if (!particles.length) return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const p of particles) {
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  drawFloaters(ctx, floaters) {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.font = 'bold 26px system-ui, sans-serif';
    for (const f of floaters) {
      ctx.globalAlpha = Math.max(0, f.life / f.maxLife);
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, f.x, f.y);
    }
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  drawHud(ctx, game) {
    const level = game.level;
    ctx.save();
    ctx.textBaseline = 'top';
    // Top-left: level number and name.
    ctx.textAlign = 'left';
    ctx.fillStyle = COLORS.hudText;
    ctx.font = 'bold 22px system-ui, sans-serif';
    ctx.fillText(`LEVEL ${game.levelIndex + 1}/12 — ${level.name}`, 24, 18);
    ctx.fillStyle = COLORS.hudDim;
    ctx.font = '15px system-ui, sans-serif';
    ctx.fillText('Drag to aim · release to launch · R restart · M mute', 24, 48);
    // Top-right: score and best.
    ctx.textAlign = 'right';
    ctx.fillStyle = COLORS.hudText;
    ctx.font = 'bold 22px system-ui, sans-serif';
    ctx.fillText(`SCORE ${game.score}`, WORLD_W - 24, 18);
    ctx.fillStyle = COLORS.hudDim;
    ctx.font = '15px system-ui, sans-serif';
    ctx.fillText(`BEST ${game.best}`, WORLD_W - 24, 48);
    // Stars collected: gold for got, outline for left.
    const total = level.stars.length;
    const got = total - game.starsLeft.length;
    for (let i = 0; i < total; i++) {
      const x = WORLD_W / 2 - (total * 34) / 2 + i * 34 + 17;
      this.drawMiniStar(ctx, x, 30, 13, i < got);
    }
    // Launches left, as little comets.
    ctx.textAlign = 'left';
    ctx.fillStyle = COLORS.hudDim;
    ctx.font = '15px system-ui, sans-serif';
    ctx.fillText('LAUNCHES', 24, 84);
    for (let i = 0; i < game.launchesLeft; i++) {
      const x = 118 + i * 26;
      ctx.fillStyle = COLORS.cometGlow;
      ctx.beginPath();
      ctx.arc(x, 92, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(127,231,255,0.5)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x - 5, 92);
      ctx.lineTo(x - 16, 92);
      ctx.stroke();
    }
    ctx.restore();
  }

  drawMiniStar(ctx, x, y, r, filled) {
    ctx.save();
    ctx.translate(x, y);
    ctx.beginPath();
    for (let k = 0; k < 10; k++) {
      const a = (k / 10) * Math.PI * 2 - Math.PI / 2;
      const rr = k % 2 === 0 ? r : r * 0.45;
      const px = Math.cos(a) * rr;
      const py = Math.sin(a) * rr;
      if (k === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    if (filled) {
      ctx.fillStyle = COLORS.starGold;
      ctx.fill();
    } else {
      ctx.strokeStyle = 'rgba(255, 215, 94, 0.55)';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    ctx.restore();
  }

  panel(ctx, x, y, w, h) {
    ctx.fillStyle = COLORS.panel;
    ctx.strokeStyle = COLORS.panelEdge;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 18);
    ctx.fill();
    ctx.stroke();
  }

  button(ctx, rect, label, hover) {
    ctx.fillStyle = hover ? COLORS.buttonHover : COLORS.button;
    ctx.beginPath();
    ctx.roundRect(rect.x, rect.y, rect.w, rect.h, 12);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, rect.x + rect.w / 2, rect.y + rect.h / 2 + 1);
  }

  drawTitle(ctx, game, time) {
    // Dim the field behind the title.
    ctx.fillStyle = 'rgba(2, 3, 10, 0.45)';
    ctx.fillRect(0, 0, WORLD_W, WORLD_H);
    const bob = Math.sin(time * 1.4) * 6;
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 96px system-ui, sans-serif';
    ctx.shadowColor = 'rgba(127, 231, 255, 0.8)';
    ctx.shadowBlur = 34;
    ctx.fillText('COMETFALL', WORLD_W / 2, 218 + bob);
    ctx.shadowBlur = 0;
    ctx.fillStyle = COLORS.starGold;
    ctx.font = '600 26px system-ui, sans-serif';
    ctx.fillText('A gravity-slingshot star hunt', WORLD_W / 2, 292 + bob);
    ctx.fillStyle = COLORS.hudDim;
    ctx.font = '18px system-ui, sans-serif';
    ctx.fillText('Drag anywhere to aim — release to launch your comet.', WORLD_W / 2, 348);
    ctx.fillText('Bend around planets, dodge void rocks, catch every star.', WORLD_W / 2, 376);
    ctx.fillText('12 levels · limited launches · best score saved', WORLD_W / 2, 404);
    ctx.restore();
    const rect = game.buttonRects.play;
    this.button(ctx, rect, '▶  PLAY', game.hoverButton === 'play');
    ctx.save();
    ctx.textAlign = 'center';
    ctx.fillStyle = COLORS.hudDim;
    ctx.font = '15px system-ui, sans-serif';
    ctx.fillText('or press Enter', WORLD_W / 2, rect.y + rect.h + 26);
    if (game.best > 0) {
      ctx.fillStyle = COLORS.starGold;
      ctx.font = 'bold 18px system-ui, sans-serif';
      ctx.fillText(`BEST SCORE ${game.best}`, WORLD_W / 2, rect.y + rect.h + 56);
    }
    ctx.fillStyle = 'rgba(157, 180, 221, 0.8)';
    ctx.font = '14px system-ui, sans-serif';
    ctx.fillText('Mouse to aim · R restart level · P pause · M mute', WORLD_W / 2, WORLD_H - 30);
    ctx.restore();
  }

  drawLevelComplete(ctx, game) {
    const cx = WORLD_W / 2;
    this.panel(ctx, cx - 300, 168, 600, 330);
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = COLORS.starGold;
    ctx.font = '900 44px system-ui, sans-serif';
    ctx.fillText('LEVEL CLEAR!', cx, 222);
    for (let i = 0; i < game.lastEarned; i++) {
      this.drawMiniStar(ctx, cx - 56 + i * 56, 292, 22, true);
    }
    ctx.fillStyle = COLORS.hudText;
    ctx.font = '20px system-ui, sans-serif';
    ctx.fillText(`Stars  ${game.lastStarPoints}   ·   Launch bonus  ${game.lastLaunchBonus}`, cx, 348);
    ctx.font = 'bold 24px system-ui, sans-serif';
    ctx.fillText(`LEVEL SCORE  ${game.lastLevelScore}`, cx, 388);
    ctx.fillStyle = COLORS.hudDim;
    ctx.font = '17px system-ui, sans-serif';
    ctx.fillText(`Total score  ${game.score}`, cx, 424);
    ctx.restore();
    const rect = game.buttonRects.next;
    this.button(ctx, rect, game.levelIndex + 1 >= 12 ? 'SEE RESULTS  ▶' : 'NEXT LEVEL  ▶', game.hoverButton === 'next');
  }

  drawLevelFailed(ctx, game) {
    const cx = WORLD_W / 2;
    this.panel(ctx, cx - 300, 190, 600, 300);
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = COLORS.danger;
    ctx.font = '900 44px system-ui, sans-serif';
    ctx.fillText('OUT OF LAUNCHES', cx, 248);
    ctx.fillStyle = COLORS.hudText;
    ctx.font = '20px system-ui, sans-serif';
    ctx.fillText(`You collected ${game.level.stars.length - game.starsLeft.length} of ${game.level.stars.length} stars.`, cx, 306);
    ctx.fillStyle = COLORS.hudDim;
    ctx.font = '17px system-ui, sans-serif';
    ctx.fillText('The stars are still out there. Try a new line.', cx, 340);
    ctx.restore();
    const rect = game.buttonRects.retry;
    this.button(ctx, rect, '↻  RETRY LEVEL', game.hoverButton === 'retry');
  }

  drawVictory(ctx, game, time) {
    ctx.fillStyle = 'rgba(2, 3, 10, 0.5)';
    ctx.fillRect(0, 0, WORLD_W, WORLD_H);
    const cx = WORLD_W / 2;
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = COLORS.starGold;
    ctx.font = '900 64px system-ui, sans-serif';
    ctx.shadowColor = 'rgba(255, 215, 94, 0.7)';
    ctx.shadowBlur = 30;
    ctx.fillText('ALL STARS CAUGHT!', cx, 200);
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#ffffff';
    ctx.font = '600 26px system-ui, sans-serif';
    ctx.fillText('You finished all 12 levels of Cometfall.', cx, 268);
    ctx.fillStyle = COLORS.hudText;
    ctx.font = 'bold 30px system-ui, sans-serif';
    ctx.fillText(`FINAL SCORE  ${game.score}`, cx, 330);
    if (game.score >= game.best && game.score > 0) {
      ctx.fillStyle = COLORS.starGold;
      ctx.font = 'bold 22px system-ui, sans-serif';
      ctx.fillText('★ NEW BEST SCORE ★', cx, 376);
    } else {
      ctx.fillStyle = COLORS.hudDim;
      ctx.font = '20px system-ui, sans-serif';
      ctx.fillText(`Best score  ${game.best}`, cx, 376);
    }
    ctx.restore();
    const rect = game.buttonRects.again;
    this.button(ctx, rect, '↻  PLAY AGAIN', game.hoverButton === 'again');
    ctx.save();
    ctx.textAlign = 'center';
    ctx.fillStyle = COLORS.hudDim;
    ctx.font = '15px system-ui, sans-serif';
    ctx.fillText('or press Enter', cx, rect.y + rect.h + 26);
    ctx.restore();
  }

  drawPaused(ctx, game) {
    ctx.fillStyle = 'rgba(2, 3, 10, 0.6)';
    ctx.fillRect(0, 0, WORLD_W, WORLD_H);
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 54px system-ui, sans-serif';
    ctx.fillText('PAUSED', WORLD_W / 2, WORLD_H / 2 - 20);
    ctx.fillStyle = COLORS.hudDim;
    ctx.font = '19px system-ui, sans-serif';
    ctx.fillText('Press P or Esc to resume · R to restart the level', WORLD_W / 2, WORLD_H / 2 + 34);
    ctx.restore();
  }

  drawHint(ctx, game) {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillStyle = 'rgba(234, 242, 255, 0.85)';
    ctx.font = '17px system-ui, sans-serif';
    ctx.fillText(game.hint, WORLD_W / 2, WORLD_H - 18);
    ctx.restore();
  }
}
