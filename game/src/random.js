// A tiny seeded random generator (mulberry32) so the starfield, nebulae and
// rock shapes are identical on every load — and identical in screenshots.
// Nothing in the game depends on Math.random.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Deterministic pick of an integer in [min, max).
export function intIn(rng, min, max) {
  return min + Math.floor(rng() * (max - min));
}
