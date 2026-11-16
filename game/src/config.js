// Cometfall — shared constants for the whole game.
// The playfield is a fixed virtual world (1280 x 720); the canvas scales it
// to fit the browser window with letterboxing, so the game looks the same
// on any desktop screen.
export const WORLD_W = 1280;
export const WORLD_H = 720;

export const COMET_RADIUS = 10;
export const STAR_RADIUS = 30; // pickup distance from a star's centre
export const MAX_LAUNCH_SPEED = 950; // px per second
export const LAUNCH_POWER = 2.4; // velocity per pixel of drag
export const MIN_DRAG = 24; // pixels of drag needed to launch
export const MAX_FLIGHT_TIME = 14; // seconds before a flight fizzles out
export const SLOW_SPEED = 42; // below this for a while, the comet fizzles
export const SLOW_TIME = 0.9; // seconds under SLOW_SPEED before fizzling

// Gravity: accel = GRAVITY * planet.mass / dist^2, capped per step.
export const GRAVITY = 3000;
export const MAX_GRAVITY_ACCEL = 2600;
export const BOUNCE_KEEP = 0.55; // speed kept after bouncing off a planet

export const STAR_POINTS = 100;
export const LAUNCH_BONUS = 150; // per unused launch on level complete

export const COLORS = {
  backgroundTop: '#0b1030',
  backgroundBottom: '#03040d',
  cometCore: '#ffffff',
  cometGlow: '#7fe7ff',
  starGold: '#ffd75e',
  starGlow: '#ff9d2e',
  hudText: '#eaf2ff',
  hudDim: '#9db4dd',
  panel: 'rgba(10, 16, 44, 0.88)',
  panelEdge: '#3b5bdb',
  button: '#2b6cff',
  buttonHover: '#4d84ff',
  danger: '#ff5d73',
};

export const PLANET_PALETTES = [
  { body: '#3ec6b8', glow: '#2dd4bf', dark: '#0f766e' },
  { body: '#e0789a', glow: '#f472b6', dark: '#9d174d' },
  { body: '#b79cff', glow: '#a78bfa', dark: '#6d28d9' },
  { body: '#ffb454', glow: '#fbbf24', dark: '#b45309' },
  { body: '#7dd3fc', glow: '#38bdf8', dark: '#0369a1' },
];
