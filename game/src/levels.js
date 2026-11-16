// Cometfall — the 12 hand-built levels.
// A level is:
//   name    — shown in the HUD and on the level-complete panel
//   par     — launches the player gets for this level
//   comet   — where the comet starts each launch
//   stars   — points to collect; the level is won when all are collected
//   planets — gravity wells; the comet bounces off them (they never destroy)
//   rocks   — void rocks; touching one shatters the comet and loses a launch
// An orbiting body has orbit: { cx, cy, radius, speed, phase } — it circles
// its centre at `speed` radians per second, starting at angle `phase`.
// All coordinates are in the 1280 x 720 world.
export const LEVELS = [
  {
    name: 'First Light',
    par: 3,
    comet: { x: 200, y: 360 },
    stars: [{ x: 1020, y: 360 }],
    planets: [],
    rocks: [],
    tip: 'Drag anywhere to aim, release to launch.',
  },
  {
    name: 'Gentle Curve',
    par: 3,
    comet: { x: 180, y: 520 },
    stars: [{ x: 1060, y: 200 }],
    planets: [{ x: 640, y: 360, r: 72, palette: 0 }],
    rocks: [],
    tip: 'Planets bend your flight — use their gravity.',
  },
  {
    name: 'Ember Twins',
    par: 3,
    comet: { x: 180, y: 360 },
    stars: [
      { x: 640, y: 130 },
      { x: 1080, y: 360 },
    ],
    planets: [
      { x: 480, y: 300, r: 58, palette: 1 },
      { x: 800, y: 420, r: 58, palette: 3 },
    ],
    rocks: [],
    tip: 'One launch can collect more than one star.',
  },
  {
    name: 'The Long Way Round',
    par: 3,
    comet: { x: 640, y: 600 },
    stars: [{ x: 640, y: 120 }],
    planets: [{ x: 640, y: 360, r: 96, palette: 2 }],
    rocks: [],
    tip: 'A big planet pulls hard. Slingshot around it.',
  },
  {
    name: 'Rock Garden',
    par: 4,
    comet: { x: 160, y: 360 },
    stars: [
      { x: 620, y: 180 },
      { x: 1080, y: 540 },
    ],
    planets: [{ x: 640, y: 360, r: 60, palette: 4 }],
    rocks: [
      { x: 420, y: 360, r: 34 },
      { x: 860, y: 360, r: 34 },
    ],
    tip: 'Void rocks shatter your comet. Steer clear.',
  },
  {
    name: 'Twin Pull',
    par: 4,
    comet: { x: 200, y: 600 },
    stars: [
      { x: 640, y: 140 },
      { x: 1060, y: 200 },
      { x: 1060, y: 560 },
    ],
    planets: [
      { x: 460, y: 300, r: 66, palette: 0 },
      { x: 840, y: 300, r: 66, palette: 1 },
    ],
    rocks: [{ x: 640, y: 560, r: 30 }],
    tip: 'Two pulls, one path. Thread them both.',
  },
  {
    name: 'Orbital Dance',
    par: 4,
    comet: { x: 200, y: 360 },
    stars: [
      { x: 900, y: 160 },
      { x: 900, y: 560 },
    ],
    planets: [
      {
        x: 640, y: 360, r: 62, palette: 3,
        orbit: { cx: 640, cy: 360, radius: 130, speed: 0.55, phase: 0 },
      },
    ],
    rocks: [{ x: 1100, y: 360, r: 36 }],
    tip: 'That planet is moving. Time your launch.',
  },
  {
    name: 'The Gauntlet',
    par: 4,
    comet: { x: 140, y: 360 },
    stars: [
      { x: 640, y: 120 },
      { x: 640, y: 600 },
      { x: 1120, y: 360 },
    ],
    planets: [{ x: 640, y: 360, r: 46, palette: 2 }],
    rocks: [
      { x: 380, y: 180, r: 30 },
      { x: 380, y: 540, r: 30 },
      { x: 900, y: 180, r: 30 },
      { x: 900, y: 540, r: 30 },
    ],
    tip: 'Between the rocks, past the planet, home.',
  },
  {
    name: 'Double Star',
    par: 4,
    comet: { x: 640, y: 640 },
    stars: [
      { x: 220, y: 180 },
      { x: 1060, y: 180 },
      { x: 640, y: 110 },
    ],
    planets: [
      {
        x: 420, y: 360, r: 58, palette: 4,
        orbit: { cx: 640, cy: 360, radius: 220, speed: 0.5, phase: 0 },
      },
      {
        x: 860, y: 360, r: 58, palette: 1,
        orbit: { cx: 640, cy: 360, radius: 220, speed: 0.5, phase: Math.PI },
      },
    ],
    rocks: [],
    tip: 'Two dancers, one sky. Wait for the gap.',
  },
  {
    name: 'Maelstrom',
    par: 5,
    comet: { x: 150, y: 150 },
    stars: [
      { x: 1130, y: 150 },
      { x: 1130, y: 570 },
      { x: 150, y: 570 },
    ],
    planets: [{ x: 640, y: 360, r: 110, palette: 2 }],
    rocks: [
      { x: 640, y: 110, r: 28 },
      { x: 640, y: 610, r: 28 },
    ],
    tip: 'The maelstrom owns the middle. Go around.',
  },
  {
    name: 'The Needle',
    par: 5,
    comet: { x: 140, y: 360 },
    stars: [
      { x: 700, y: 360 },
      { x: 1140, y: 140 },
      { x: 1140, y: 580 },
    ],
    planets: [{ x: 940, y: 360, r: 58, palette: 0 }],
    rocks: [
      { x: 430, y: 278, r: 38 },
      { x: 430, y: 442, r: 38 },
      { x: 700, y: 120, r: 30 },
      { x: 700, y: 600, r: 30 },
    ],
    tip: 'Thread the needle between the rocks.',
  },
  {
    name: 'Grand Finale',
    par: 5,
    comet: { x: 640, y: 640 },
    stars: [
      { x: 180, y: 140 },
      { x: 1100, y: 140 },
      { x: 1100, y: 580 },
      { x: 180, y: 580 },
    ],
    planets: [
      {
        x: 640, y: 360, r: 70, palette: 3,
        orbit: { cx: 640, cy: 360, radius: 150, speed: 0.6, phase: 0 },
      },
      {
        x: 640, y: 360, r: 52, palette: 4,
        orbit: { cx: 640, cy: 360, radius: 260, speed: -0.4, phase: 1.2 },
      },
    ],
    rocks: [
      { x: 640, y: 120, r: 26 },
      { x: 640, y: 600, r: 26 },
      { x: 120, y: 360, r: 26 },
      { x: 1160, y: 360, r: 26 },
    ],
    tip: 'Everything at once. Make it count, comet.',
  },
];
