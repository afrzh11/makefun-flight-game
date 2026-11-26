# Nusantara Skies

[![make.fun](https://make.fun/badge/best-flight-game-20261126-0057.svg)](https://make.fun/bounty/best-flight-game-20261126-0057)
[![rank](https://make.fun/badge/best-flight-game-20261126-0057/afrzh11/makefun-flight-game/rank.svg)](https://make.fun/bounty/best-flight-game-20261126-0057)
[![reward](https://make.fun/badge/best-flight-game-20261126-0057/afrzh11/makefun-flight-game/reward.svg)](https://make.fun/bounty/best-flight-game-20261126-0057)

A bush-pilot flight game over the Indonesian archipelago, built for the
[make.fun "Make the best flight game" bounty](https://make.fun/bounty/best-flight-game-20261126-0057).
Fly a twin-prop bush plane between volcanic islands: thread glowing rings,
land on island runways, and drop cargo on the mark — all while fuel burns
and the crosswind pushes you sideways.

## How to play

- **W / S** — throttle up / down
- **↑ / ↓** — pitch (climb / descend)
- **← / →** or **A / D** — bank and turn
- **Mouse** — hold the left button and move to steer; the wheel trims throttle
- **Space** — drop cargo (cargo missions)
- **P** — pause · **M** — mute · **R** — restart · **Enter** — start / fly again

## Missions

Three sortie types rotate and get harder each level:

1. **Cincin Langit** — fly through the glowing rings in order before the timer ends.
2. **Mendarat di Pulau** — put the plane down gently on an island runway; a landing refills the tank.
3. **Antar Kargo** — reach the yellow drop zone and press Space to drop the cargo on the mark.

Watch the fuel gauge and the damage meter: a stall sinks you, a hard landing
hurts the airframe, and running dry over open sea ends the sortie — unless
you can glide onto a runway.

## Running it

Static files, no build step, no network:

```sh
node serve.ts
# open http://localhost:8080
```

## Layout

- `game/` — the playable game (`index.html`, `css/style.css`, `js/` split by job:
  `main.js` boot + loop, `state.js` game state, `world.js` archipelago
  generation, `flight.js` flight model, `missions.js` missions, `terrain.js`
  sky/sea/island rendering, `aircraft.js` the plane, `hud.js` instruments,
  `audio.js` WebAudio synth, `input.js` keyboard + mouse, `demo.js`
  deterministic screenshot scenes, `render.js` scene orchestration)
- `screenshots/` — 4 real renders of the game's own code
- `main.ts` — the entry program: copies `game/` + `screenshots/` to `/output`
  and writes `/output/dossier.json` with `vendor/makefun-game.ts`
- `vendor/makefun-game.ts` — the kit's library, unchanged

All art is drawn in code and all sound is synthesised with WebAudio.
Original game: no commercial names, characters, art, music or levels.
