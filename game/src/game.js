// Cometfall — the game state machine: title, aiming, flying, level clear,
// level failed, victory and pause. It owns the score, the level progress,
// the particles and the comet, and steps the physics through physics.js.
import {
  LAUNCH_BONUS,
  LAUNCH_POWER,
  MAX_FLIGHT_TIME,
  MAX_LAUNCH_SPEED,
  MIN_DRAG,
  SLOW_SPEED,
  SLOW_TIME,
  STAR_POINTS,
  WORLD_H,
  WORLD_W,
} from './config.js';
import { LEVELS } from './levels.js';
import { previewPath, stepComet } from './physics.js';
import { SoundBank } from './audio.js';

const BEST_KEY = 'cometfall-best';
const HINT_TIME = 7; // seconds a level's tip stays on screen

export class Game {
  constructor() {
    this.sounds = new SoundBank();
    this.state = 'title';
    this.prevState = null; // for unpausing
    this.time = 0;
    this.levelTime = 0;
    this.levelIndex = 0;
    this.level = null;
    this.starsLeft = [];
    this.launchesLeft = 0;
    this.score = 0;
    this.scoreAtLevelStart = 0;
    this.levelStarPoints = 0;
    this.best = 0;
    try {
      this.best = Number(localStorage.getItem(BEST_KEY) || 0) || 0;
    } catch {
      this.best = 0;
    }
    this.comet = { x: 0, y: 0, vx: 0, vy: 0 };
    this.trail = [];
    this.particles = [];
    this.floaters = [];
    this.flightTime = 0;
    this.slowTime = 0;
    this.completeTimer = 0;
    this.hint = '';
    this.hintTimer = 0;
    this.input = null; // set by main.js after Input is built
    this.hoverButton = null;
    // Overlay button rectangles, in world coordinates (shared with render.js).
    this.buttonRects = {
      play: { x: WORLD_W / 2 - 110, y: 440, w: 220, h: 58 },
      next: { x: WORLD_W / 2 - 150, y: 440, w: 300, h: 52 },
      retry: { x: WORLD_W / 2 - 150, y: 416, w: 300, h: 52 },
      again: { x: WORLD_W / 2 - 150, y: 430, w: 300, h: 56 },
    };
    // Last level's breakdown, shown on the level-clear panel.
    this.lastEarned = 0;
    this.lastStarPoints = 0;
    this.lastLaunchBonus = 0;
    this.lastLevelScore = 0;
    this.renderer = null; // set by main.js for screen shake
  }

  // ---- flow ------------------------------------------------------------
  startGame() {
    this.score = 0;
    this.levelIndex = 0;
    this.loadLevel(0);
    this.sounds.click();
  }

  loadLevel(index) {
    this.levelIndex = index;
    this.level = LEVELS[index];
    this.starsLeft = this.level.stars.map((s) => ({ ...s }));
    this.launchesLeft = this.level.par;
    this.scoreAtLevelStart = this.score;
    this.levelStarPoints = 0;
    this.resetComet();
    this.levelTime = 0;
    this.completeTimer = 0;
    this.state = 'aim';
    this.hint = this.level.tip;
    this.hintTimer = HINT_TIME;
  }

  restartLevel() {
    this.score = this.scoreAtLevelStart;
    this.loadLevel(this.levelIndex);
    this.sounds.click();
  }

  nextLevel() {
    this.sounds.click();
    if (this.levelIndex + 1 >= LEVELS.length) {
      this.state = 'victory';
      this.sounds.gameWin();
      this.saveBest();
      return;
    }
    this.loadLevel(this.levelIndex + 1);
  }

  playAgain() {
    this.startGame();
  }

  pause() {
    if (this.state === 'paused') return;
    this.prevState = this.state;
    this.state = 'paused';
  }

  resume() {
    if (this.state !== 'paused') return;
    this.state = this.prevState || 'aim';
    this.prevState = null;
  }

  toggleMute() {
    return this.sounds.toggleMute();
  }

  saveBest() {
    if (this.score > this.best) {
      this.best = this.score;
      try {
        localStorage.setItem(BEST_KEY, String(this.best));
      } catch {
        /* storage unavailable; best still shows for this session */
      }
    }
  }

  // ---- aiming and launching ---------------------------------------------
  dragVelocity(dragStart, dragNow) {
    let vx = (dragStart.x - dragNow.x) * LAUNCH_POWER;
    let vy = (dragStart.y - dragNow.y) * LAUNCH_POWER;
    const speed = Math.hypot(vx, vy);
    if (speed > MAX_LAUNCH_SPEED) {
      vx = (vx / speed) * MAX_LAUNCH_SPEED;
      vy = (vy / speed) * MAX_LAUNCH_SPEED;
    }
    return { x: vx, y: vy };
  }

  previewFor(velocity) {
    return previewPath(
      { x: this.comet.x, y: this.comet.y },
      velocity,
      this.level,
      this.starsLeft,
    );
  }

  releaseDrag(dragStart, dragNow) {
    if (this.state !== 'aim') return;
    const dragLen = Math.hypot(dragStart.x - dragNow.x, dragStart.y - dragNow.y);
    if (dragLen < MIN_DRAG) return; // a tap is not a launch
    const v = this.dragVelocity(dragStart, dragNow);
    this.launch(v);
  }

  launch(v) {
    this.comet.vx = v.x;
    this.comet.vy = v.y;
    this.trail = [{ x: this.comet.x, y: this.comet.y }];
    this.flightTime = 0;
    this.slowTime = 0;
    this.state = 'flying';
    this.sounds.launch();
  }

  resetComet() {
    this.comet = { x: this.level.comet.x, y: this.level.comet.y, vx: 0, vy: 0 };
    this.trail = [];
    this.flightTime = 0;
    this.slowTime = 0;
  }

  // ---- per-frame update ---------------------------------------------------
  update(dt) {
    this.time += dt;
    if (this.hintTimer > 0) {
      this.hintTimer -= dt;
      if (this.hintTimer <= 0) this.hint = '';
    }
    this.updateParticles(dt);
    this.updateFloaters(dt);
    this.updateHover();

    if (this.state === 'aim' || this.state === 'flying') {
      this.levelTime += dt;
    }
    if (this.state !== 'flying') return;

    // Step the flight in small substeps so fast passes near a planet stay
    // accurate and cannot tunnel through a rock.
    const sub = 1 / 120;
    let left = dt;
    while (left > 0) {
      const h = Math.min(sub, left);
      left -= h;
      this.flightTime += h;
      const event = stepComet(this.comet, this.level, this.starsLeft, this.levelTime, h);
      this.trail.push({ x: this.comet.x, y: this.comet.y });
      if (this.trail.length > 140) this.trail.shift();
      if (event) {
        if (event.type === 'star') this.collectStar(event.star);
        else if (event.type === 'rock') return this.loseLaunch('shattered on a void rock');
        else if (event.type === 'escaped') return this.loseLaunch('flew off into the dark');
        else if (event.type === 'planet') this.onBounce();
        if (this.completeTimer > 0) break;
      }
    }

    // A flight that drags on, or crawls to a stop, fizzles out.
    const speed = Math.hypot(this.comet.vx, this.comet.vy);
    if (speed < SLOW_SPEED) this.slowTime += dt;
    else this.slowTime = 0;
    if (this.flightTime > MAX_FLIGHT_TIME || this.slowTime > SLOW_TIME) {
      this.loseLaunch('fizzled out');
      return;
    }

    // Last star caught: let the comet fly on a beat, then clear the level.
    if (this.completeTimer > 0) {
      this.completeTimer -= dt;
      if (this.completeTimer <= 0) this.completeLevel();
    }
  }

  collectStar(star) {
    this.starsLeft = this.starsLeft.filter((s) => s !== star);
    this.score += STAR_POINTS;
    this.levelStarPoints += STAR_POINTS;
    this.sounds.collect();
    this.burst(star.x, star.y, '#ffd75e', 26, 260);
    this.addFloater(star.x, star.y - 24, `+${STAR_POINTS}`, '#ffd75e');
    if (this.starsLeft.length === 0) {
      this.completeTimer = 0.7;
    }
  }

  onBounce() {
    this.sounds.bounce();
    this.burst(this.comet.x, this.comet.y, '#7fe7ff', 8, 120);
    if (this.renderer) this.renderer.addShake(3);
  }

  loseLaunch(reason) {
    this.launchesLeft -= 1;
    if (reason.includes('shattered')) {
      this.sounds.shatter();
      this.burst(this.comet.x, this.comet.y, '#ff8a7a', 40, 320);
      this.burst(this.comet.x, this.comet.y, '#ffffff', 16, 200);
      if (this.renderer) this.renderer.addShake(10);
    } else {
      this.sounds.fizzle();
    }
    this.addFloater(this.comet.x, this.comet.y - 30, reason, '#ff9db1');
    if (this.launchesLeft <= 0) {
      this.floaters = []; // keep the fail panel's text unobstructed
      this.state = 'levelFailed';
      this.sounds.levelLose();
      this.saveBest();
      return;
    }
    this.resetComet();
    this.state = 'aim';
  }

  completeLevel() {
    const bonus = this.launchesLeft * LAUNCH_BONUS;
    this.score += bonus;
    this.lastEarned = this.level.stars.length;
    this.lastStarPoints = this.levelStarPoints;
    this.lastLaunchBonus = bonus;
    this.lastLevelScore = this.levelStarPoints + bonus;
    this.state = 'levelComplete';
    this.sounds.levelWin();
    this.saveBest();
  }

  // ---- particles and floating text ---------------------------------------
  burst(x, y, color, count, speed) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = (0.3 + Math.random() * 0.7) * speed;
      this.particles.push({
        x, y,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v,
        life: 0.6 + Math.random() * 0.4,
        maxLife: 1,
        size: 1.5 + Math.random() * 3,
        color,
      });
    }
    for (const p of this.particles.slice(-count)) p.maxLife = p.life;
  }

  addFloater(x, y, text, color) {
    this.floaters.push({ x, y, text, color, life: 1.4, maxLife: 1.4 });
  }

  updateParticles(dt) {
    for (const p of this.particles) {
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.98;
      p.vy *= 0.98;
    }
    this.particles = this.particles.filter((p) => p.life > 0);
  }

  updateFloaters(dt) {
    for (const f of this.floaters) {
      f.life -= dt;
      f.y -= 28 * dt;
    }
    this.floaters = this.floaters.filter((f) => f.life > 0);
  }

  // ---- buttons and keys ----------------------------------------------------
  updateHover() {
    if (!this.input) return;
    const p = this.input.hover;
    const name =
      this.state === 'title' ? 'play'
      : this.state === 'levelComplete' ? 'next'
      : this.state === 'levelFailed' ? 'retry'
      : this.state === 'victory' ? 'again'
      : null;
    this.hoverButton = null;
    if (name) {
      const r = this.buttonRects[name];
      if (p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h) {
        this.hoverButton = name;
      }
    }
  }

  clickButton(x, y) {
    const name =
      this.state === 'title' ? 'play'
      : this.state === 'levelComplete' ? 'next'
      : this.state === 'levelFailed' ? 'retry'
      : this.state === 'victory' ? 'again'
      : null;
    if (!name) return false;
    const r = this.buttonRects[name];
    if (x < r.x || x > r.x + r.w || y < r.y || y > r.y + r.h) return false;
    if (name === 'play') this.startGame();
    else if (name === 'next') this.nextLevel();
    else if (name === 'retry') this.restartLevel();
    else if (name === 'again') this.playAgain();
    return true;
  }

  pressKey(key) {
    switch (this.state) {
      case 'title':
        if (key === 'enter' || key === ' ') this.startGame();
        break;
      case 'aim':
      case 'flying':
        if (key === 'p' || key === 'escape') this.pause();
        else if (key === 'r') this.restartLevel();
        break;
      case 'paused':
        if (key === 'p' || key === 'escape') this.resume();
        else if (key === 'r') {
          this.resume();
          this.restartLevel();
        }
        break;
      case 'levelComplete':
        if (key === 'enter' || key === ' ' || key === 'n') this.nextLevel();
        break;
      case 'levelFailed':
        if (key === 'enter' || key === ' ' || key === 'r') this.restartLevel();
        break;
      case 'victory':
        if (key === 'enter' || key === ' ') this.playAgain();
        break;
      default:
        break;
    }
  }

  // ---- screenshot staging --------------------------------------------------
  // The ?shot= parameter stages a fixed scene for screenshots. These are
  // real states of the real game, reached through its own methods.
  applyShot(shot) {
    if (shot === 'play') {
      // Mid-flight on a busy level: two planets, three stars, one rock.
      this.startGame();
      this.loadLevel(5);
      this.launch({ x: 430, y: -480 });
      // Step the flight forward so the trail is drawn and the comet is
      // curving around the first planet.
      for (let i = 0; i < 55; i++) this.update(1 / 60);
      this.state = 'flying';
    } else if (shot === 'win') {
      this.startGame();
      this.loadLevel(0);
      // As if the star was really collected: 100 points banked, then the
      // clear bonus lands on top, so LEVEL SCORE and total agree.
      this.score = STAR_POINTS;
      this.levelStarPoints = STAR_POINTS;
      this.starsLeft = [];
      this.launchesLeft = 2;
      this.completeLevel();
    } else if (shot === 'lose') {
      this.startGame();
      this.loadLevel(0);
      this.launchesLeft = 1;
      this.loseLaunch('shattered on a void rock');
    }
    // 'start' (or anything else) leaves the title screen as it is.
  }
}
