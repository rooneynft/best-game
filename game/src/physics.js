// Cometfall — the flight physics, kept pure so the aim preview, the game
// loop and the offline tests all step the same world.
import {
  BOUNCE_KEEP,
  COMET_RADIUS,
  GRAVITY,
  MAX_GRAVITY_ACCEL,
  STAR_RADIUS,
  WORLD_H,
  WORLD_W,
} from './config.js';

// Where a body is at time t (seconds since the level started). Static
// bodies never move; orbiting ones circle their orbit centre.
export function bodyPosition(body, t) {
  if (!body.orbit) return { x: body.x, y: body.y };
  const o = body.orbit;
  const a = o.phase + o.speed * t;
  return { x: o.cx + Math.cos(a) * o.radius, y: o.cy + Math.sin(a) * o.radius };
}

// Mass scales with area so big planets pull harder.
export function planetMass(planet) {
  return planet.r * planet.r;
}

// One fixed step of the comet's flight. `state` is { x, y, vx, vy } and is
// mutated in place. Returns an event describing what happened this step:
//   null                       — nothing special
//   { type: 'star', star }     — a star was collected
//   { type: 'rock' }           — the comet hit a void rock
//   { type: 'planet' }         — the comet bounced off a planet
//   { type: 'escaped' }        — the comet left the world
export function stepComet(state, level, starsLeft, t, dt) {
  // Gravity from every planet, capped so a near miss never explodes.
  let ax = 0;
  let ay = 0;
  for (const planet of level.planets) {
    const p = bodyPosition(planet, t);
    const dx = p.x - state.x;
    const dy = p.y - state.y;
    const d2 = dx * dx + dy * dy;
    const d = Math.sqrt(d2) || 1;
    let a = (GRAVITY * planetMass(planet)) / d2;
    if (a > MAX_GRAVITY_ACCEL) a = MAX_GRAVITY_ACCEL;
    ax += (dx / d) * a;
    ay += (dy / d) * a;
  }
  state.vx += ax * dt;
  state.vy += ay * dt;
  state.x += state.vx * dt;
  state.y += state.vy * dt;

  // Off the edge of the world: the flight is lost.
  if (state.x < -40 || state.x > WORLD_W + 40 || state.y < -40 || state.y > WORLD_H + 40) {
    return { type: 'escaped' };
  }

  // Stars: generous pickup radius, one per step at most.
  for (const star of starsLeft) {
    const dx = star.x - state.x;
    const dy = star.y - state.y;
    if (dx * dx + dy * dy < STAR_RADIUS * STAR_RADIUS) {
      return { type: 'star', star };
    }
  }

  // Void rocks shatter the comet.
  for (const rock of level.rocks) {
    const p = bodyPosition(rock, t);
    const dx = p.x - state.x;
    const dy = p.y - state.y;
    const rr = rock.r + COMET_RADIUS - 2;
    if (dx * dx + dy * dy < rr * rr) return { type: 'rock' };
  }

  // Planets are solid: bounce off with damped speed.
  for (const planet of level.planets) {
    const p = bodyPosition(planet, t);
    const dx = state.x - p.x;
    const dy = state.y - p.y;
    const d = Math.sqrt(dx * dx + dy * dy) || 1;
    const rr = planet.r + COMET_RADIUS;
    if (d < rr) {
      const nx = dx / d;
      const ny = dy / d;
      // Push out of the planet so it cannot stick.
      state.x = p.x + nx * rr;
      state.y = p.y + ny * rr;
      const along = state.vx * nx + state.vy * ny;
      if (along < 0) {
        state.vx -= (1 + BOUNCE_KEEP) * along * nx;
        state.vy -= (1 + BOUNCE_KEEP) * along * ny;
      }
      return { type: 'planet' };
    }
  }
  return null;
}

// Simulate a flight from a launch and return the dotted preview path the
// aim line draws: up to `seconds` of flight, one point every step.
// Stops early on a star, a rock or an escape, like the real flight would.
export function previewPath(start, velocity, level, starsLeft, seconds = 1.4) {
  const points = [];
  const state = { x: start.x, y: start.y, vx: velocity.x, vy: velocity.y };
  const dt = 1 / 60;
  let t = 0;
  for (let i = 0; i < Math.floor(seconds / dt); i++) {
    const event = stepComet(state, level, starsLeft, t, dt);
    t += dt;
    points.push({ x: state.x, y: state.y });
    if (event) break;
  }
  return points;
}
