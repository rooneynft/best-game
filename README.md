# Cometfall

[![make.fun](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01)
[![rank](https://make.fun/badge/best-game-01/rooneynft/best-game/rank.svg)](https://make.fun/bounty/best-game-01)
[![reward](https://make.fun/badge/best-game-01/rooneynft/best-game/reward.svg)](https://make.fun/bounty/best-game-01)

**Cometfall** is an entry for the [Make the best game](https://make.fun/bounty/best-game-01) bounty on make.fun — a gravity-slingshot star hunt. You are a comet. Drag anywhere to aim, release to launch, bend your flight around planets, dodge the void rocks that shatter you, and catch every star.

## How to play

- **Aim:** press and hold the mouse anywhere, drag to pull the slingshot — a dotted preview shows where your comet will fly.
- **Launch:** release the mouse. Your comet flies with real gravity from every planet.
- **Planets** bend your flight and bounce you off if you touch them. **Void rocks** shatter your comet and cost a launch. Flying off the edge or fizzling out costs a launch too.
- **Win a level** by collecting all its stars. Each level gives you a limited number of launches — run out and the level fails.
- **Win the game** by clearing all 12 levels. Stars are worth 100 points each, and every unused launch is worth 150 bonus points. Your best score is saved in your browser.

## Controls

| Input | Action |
| --- | --- |
| Mouse drag + release | Aim and launch |
| Enter / Space | Start, next level, retry, play again |
| R | Restart the level |
| P or Esc | Pause / resume |
| M | Mute / unmute |
| Click | The on-screen buttons (Play, Next, Retry, Play Again) |

## The game

- 12 hand-built levels, from a gentle first launch to the Grand Finale with two orbiting planets and a ring of void rocks.
- Planets with real gravity, orbiting planets on later levels, a live trajectory preview while you aim, a glowing comet trail, particle bursts, screen shake and synthesised sound effects (WebAudio — no audio files, no network).
- A full loop: title screen → play → level clear / out of launches → next level → victory screen with your final score → play again.
- Runs entirely from static files: open `game/index.html` from any static server and play offline. No build step, no dependencies, no network requests.

## Play it locally

```sh
node serve.ts
# open http://localhost:8080
```

## Layout

- `game/` — the game itself: `index.html` and the ES modules under `game/src/` (state machine, physics, rendering, levels, input, sound).
- `screenshots/` — 4 screenshots taken from the running game: title, gameplay, level clear and out of launches.
- `main.ts` — the entry program (Node 22): copies `game/` and `screenshots/` to `/output` and writes `/output/dossier.json` with the vendored make.fun library.
- `vendor/makefun-game.ts` — the kit's library, unchanged.
- `serve.ts` — a tiny static server for local play-testing.
- `shots.json` — the four screenshot scenes (`?shot=start|play|win|lose`).

## License

MIT — see [LICENSE](LICENSE).
