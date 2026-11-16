// Cometfall — offline beatability check (Node 22, no browser needed).
// For every level, a greedy search tries candidate launches (angles x speeds)
// against the real physics in physics.js and reports whether the level can
// be cleared within its launch budget. Run from the repository root:
//   node scripts/simulate-levels.mjs
import { LEVELS } from '../game/src/levels.js';
import { bodyPosition, stepComet } from '../game/src/physics.js';
import { COMET_RADIUS } from '../game/src/config.js';

// Simulate one flight; returns { collected, endState, time, minDist } where
// minDist is the closest the comet ever came to any star of the level.
function simulateFlight(level, start, velocity, starsLeft, t0) {
  const state = { x: start.x, y: start.y, vx: velocity.x, vy: velocity.y };
  const remaining = [...starsLeft];
  const collected = [];
  let minDist = Infinity;
  const dt = 1 / 120;
  let t = t0;
  let flightTime = 0;
  let slowTime = 0;
  while (flightTime < 14) {
    const event = stepComet(state, level, remaining, t, dt);
    t += dt;
    flightTime += dt;
    for (const s of level.stars) {
      const d = Math.hypot(s.x - state.x, s.y - state.y);
      if (d < minDist) minDist = d;
    }
    if (event) {
      if (event.type === 'star') {
        collected.push(event.star);
        const i = remaining.indexOf(event.star);
        if (i !== -1) remaining.splice(i, 1);
        if (remaining.length === 0) return { collected, remaining, endState: 'cleared', time: t, minDist };
      } else if (event.type === 'rock' || event.type === 'escaped') {
        return { collected, remaining, endState: event.type, time: t, minDist };
      }
      // 'planet' bounces just continue the flight.
    }
    const speed = Math.hypot(state.vx, state.vy);
    if (speed < 42) slowTime += dt;
    else slowTime = 0;
    if (slowTime > 0.9) return { collected, remaining, endState: 'fizzled', time: t, minDist };
  }
  return { collected, remaining, endState: 'timeout', time: t, minDist };
}

const candidates = [];
for (let deg = 0; deg < 360; deg += 5) {
  for (const speed of [300, 400, 500, 600, 700, 800, 900, 950]) {
    const a = (deg * Math.PI) / 180;
    candidates.push({ x: Math.cos(a) * speed, y: Math.sin(a) * speed });
  }
}

let allOk = true;
LEVELS.forEach((level, li) => {
  let starsLeft = level.stars.map((s) => ({ ...s }));
  let launches = level.par;
  let t = 0;
  let log = [];
  while (launches > 0 && starsLeft.length > 0) {
    let best = null;
    for (const v of candidates) {
      const r = simulateFlight(level, level.comet, v, starsLeft, t);
      // Most stars first; among equals, the flight that came closest to a
      // star, so the search explores promising lines instead of stalling.
      const score = r.collected.length * 10000 - r.minDist;
      if (!best || score > best.score) best = { ...r, score, v };
    }
    if (best.collected.length === 0 && best.endState !== 'cleared') {
      // No candidate collects anything; take the first candidate so the
      // search still advances time and does not loop forever.
      best = { ...simulateFlight(level, level.comet, candidates[0], starsLeft, t), v: candidates[0] };
    }
    log.push(`${best.collected.length}★(${best.endState})`);
    starsLeft = best.remaining;
    t = best.time;
    launches -= 1;
  }
  const ok = starsLeft.length === 0;
  if (!ok) allOk = false;
  console.log(
    `${ok ? 'PASS' : 'FAIL'}  level ${String(li + 1).padStart(2)} ${level.name.padEnd(16)} ` +
      `par ${level.par}  used ${level.par - launches}  ${log.join(' → ')}`,
  );
});
if (!allOk) {
  console.log('\nSome levels were not cleared by the greedy search (it is a weak player, not proof of impossibility).');
  process.exit(1);
}
console.log('\nAll 12 levels are clearable within their launch budget.');
