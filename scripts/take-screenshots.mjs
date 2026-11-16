// Cometfall — screenshot + playtest driver (Node 22, playwright-core).
// Serves game/ on a local port, opens it in headless Chrome, takes the four
// screenshots from shots.json, and play-tests the real game: start, launch,
// flight end, restart. Run from the repository root:
//   node scripts/take-screenshots.mjs [--port 8091] [--out screenshots]
// Exits 1 if any page error appears or a playtest assertion fails.
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import { readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = fileURLToPath(new URL('..', import.meta.url));
const args = process.argv.slice(2);
const portIndex = args.indexOf('--port');
const port = portIndex === -1 ? 8091 : Number(args[portIndex + 1]);
const outIndex = args.indexOf('--out');
const outDir = outIndex === -1 ? join(here, 'screenshots') : args[outIndex + 1];
const shots = JSON.parse(readFileSync(join(here, 'shots.json'), 'utf8'));

const failures = [];
function check(name, ok, detail = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures.push(name);
}

const server = spawn('node', ['serve.ts', '--port', String(port)], {
  cwd: here,
  stdio: ['ignore', 'pipe', 'pipe'],
});
await new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error('server did not start')), 10000);
  server.stdout.on('data', () => {
    clearTimeout(timer);
    resolve();
  });
  server.on('error', reject);
});

const browser = await chromium.launch({
  executablePath: '/usr/bin/google-chrome-stable',
  headless: true,
  args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(`console: ${m.text()}`);
});

const state = () => page.evaluate(() => window.__cometfall?.state);
const snap = () =>
  page.evaluate(() => {
    const g = window.__cometfall;
    return {
      state: g.state,
      level: g.levelIndex + 1,
      starsLeft: g.starsLeft.length,
      launchesLeft: g.launchesLeft,
      score: g.score,
    };
  });

// --- screenshots ---------------------------------------------------------
for (const shot of shots) {
  await page.goto(`http://localhost:${port}/${shot.query}`, { waitUntil: 'load' });
  await page.waitForTimeout(shot.query.includes('play') ? 600 : 1000);
  const file = join(outDir, shot.name);
  await page.screenshot({ path: file, type: 'jpeg', quality: 85 });
  const bytes = statSync(file).size;
  console.log(`SHOT  ${shot.name}  ${bytes} bytes  state=${await state()}`);
  check(`screenshot ${shot.name} under 256 KiB`, bytes <= 262144, `${bytes} bytes`);
}

// --- playtest: the real loop, driven like a player ------------------------
await page.goto(`http://localhost:${port}/`, { waitUntil: 'load' });
await page.waitForTimeout(500);
check('title screen shows', (await state()) === 'title', await state());

// Click PLAY (world 640,469; the 1280x720 viewport maps 1:1 onto the world).
await page.mouse.click(640, 469);
await page.waitForTimeout(300);
let s = await snap();
check('PLAY starts level 1 in aim state', s.state === 'aim' && s.level === 1, JSON.stringify(s));

// Drag from the comet (200,360) down-left and release: slingshot up-right.
await page.mouse.move(200, 360);
await page.mouse.down();
await page.mouse.move(120, 440, { steps: 8 });
await page.mouse.up();
await page.waitForTimeout(200);
s = await snap();
check('drag launches the comet', s.state === 'flying', JSON.stringify(s));

// Let the flight finish on its own (max 14 s, usually ~2-4 s).
for (let i = 0; i < 40; i++) {
  await page.waitForTimeout(400);
  s = await snap();
  if (s.state !== 'flying') break;
}
check('flight ends back in aim (or level clear)', s.state === 'aim' || s.state === 'levelComplete', JSON.stringify(s));

// Restart key resets the level.
await page.keyboard.press('r');
await page.waitForTimeout(200);
s = await snap();
check('R restarts the level', s.state === 'aim' && s.launchesLeft === 3, JSON.stringify(s));

// Pause and resume.
await page.keyboard.press('p');
await page.waitForTimeout(150);
check('P pauses', (await state()) === 'paused', await state());
await page.keyboard.press('p');
await page.waitForTimeout(150);
check('P resumes', (await state()) === 'aim', await state());

// A weak tap (no drag) must not launch.
await page.mouse.click(640, 360);
await page.waitForTimeout(200);
check('a tap without drag does not launch', (await state()) === 'aim', await state());

check('no page or console errors', errors.length === 0, errors.join(' | '));

await browser.close();
server.kill();
if (failures.length) {
  console.log(`\n${failures.length} check(s) failed: ${failures.join(', ')}`);
  process.exit(1);
}
console.log('\nAll screenshot + playtest checks passed.');
