// Nusantara Skies: a bush-pilot flight game over the Indonesian archipelago.
// Boot, game loop and screen flow. The world, flight model, missions,
// rendering, sound and input each live in their own file.
import { createGameState, resetRun } from './state.js';
import { buildWorld, recycleWorld, makeRng } from './world.js';
import { updateFlight } from './flight.js';
import { startMission, updateMissions, dropCargo } from './missions.js';
import { renderFrame } from './render.js';
import { createAudio } from './audio.js';
import { createInput } from './input.js';
import { applyShot } from './demo.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const W = 1280;
const H = 720;
canvas.width = W;
canvas.height = H;

const params = new URLSearchParams(window.location.search);
const shotName = params.get('shot');
const seed = Number(params.get('seed') || 1);

const state = createGameState();
state.seed = seed;
buildWorld(state, seed);
// Exposed for live play-tests (and debugging): the whole game state.
window.__game = state;
const rng = makeRng(seed * 7919 + 13);
const input = createInput(canvas);
const sound = createAudio();

let muted = false;
let lastRingScore = 0;
let lastLandScore = 0;

function startFlying() {
  resetRun(state);
  buildWorld(state, seed);
  state.screen = 'flying';
  state.elapsed = 0;
  state.crosswind = 2 + state.level * 2;
  startMission(state, 0);
  sound.unlock();
  sound.click();
}

if (shotName) {
  applyShot(state, shotName, seed);
} else {
  state.screen = 'title';
}

let lastTime = performance.now();
let framesRendered = 0;

function frame(now) {
  const dt = Math.min(0.05, (now - lastTime) / 1000);
  lastTime = now;
  const time = now / 1000;

  // --- Screen flow keys -------------------------------------------------------
  if (input.consumePress('Enter')) {
    if (state.screen === 'title' || state.screen === 'crashed'
      || state.screen === 'outoffuel' || state.screen === 'complete') {
      startFlying();
    }
  }
  if (input.consumePress('KeyP')) {
    if (state.screen === 'flying') state.screen = 'paused';
    else if (state.screen === 'paused') state.screen = 'flying';
  }
  if (input.consumePress('KeyM')) {
    muted = !muted;
    sound.setMuted(muted);
  }
  if (input.consumePress('KeyR')) {
    if (state.screen !== 'title') startFlying();
  }
  if (input.consumePress('Space')) {
    if (state.screen === 'flying') dropCargo(state);
  }
  if (input.pressedKeys.has('Enter') && state.screen === 'title') {
    // Holding Enter on the title screen also starts, for mouse-only players
    // who click: the canvas click listener below covers that path.
  }

  // --- Simulation (frozen in ?shot= mode so screenshots are deterministic) ----
  if (state.screen === 'flying' && !shotName) {
    const prevScore = state.score;
    const prevScreen = state.screen;
    updateFlight(state, input, dt, rng);
    if (state.screen === 'flying') updateMissions(state, dt);
    recycleWorld(state, rng);
    if (state.score > prevScore) {
      // A ring or a landing just paid out: play the matching cue.
      if (state.mission && state.mission.type === 'land' && state.landed) sound.land();
      else if (prevScore !== state.score) sound.ring();
    }
    if (state.screen === 'crashed') sound.crash();
    if (state.screen === 'outoffuel') sound.crash();
    if (state.screen === 'complete') sound.success();
    if (state.screen !== prevScreen && state.screen === 'flying') {
      // Mission advanced; nothing to play here.
    }
    lastRingScore = state.score;
    lastLandScore = state.score;
  }

  // --- Audio follows the flight ------------------------------------------------------
  sound.update(state.throttle, state.speed, state.screen === 'flying');

  renderFrame(ctx, W, H, state, time);
  framesRendered += 1;
  // Screenshot mode: signal readiness after a few settled frames.
  if (shotName && framesRendered >= 3) window.__shotReady = true;
  requestAnimationFrame(frame);
}

// First user gesture unlocks audio (browsers block it before that).
window.addEventListener('keydown', () => sound.unlock(), { once: true });
window.addEventListener('mousedown', () => sound.unlock(), { once: true });

// Clicking the canvas on the title screen starts the flight.
canvas.addEventListener('click', () => {
  if (state.screen === 'title') startFlying();
  sound.unlock();
});

requestAnimationFrame(frame);
