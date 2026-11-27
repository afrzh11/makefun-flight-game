// Flight model for Nusantara Skies: throttle, pitch, bank and heading with
// stall, fuel burn, crosswind drift and ground contact. Forgiving on purpose:
// the plane auto-levels, the stall is a sink you can fly out of, and a
// gentle touchdown on a runway is a landing, not a crash.
import { WORLD, showMessage, addScore } from './state.js';
import { terrainHeight, runwayUnder } from './world.js';

const DEG = Math.PI / 180;

export function updateFlight(state, input, dt, rng) {
  if (state.screen !== 'flying') return;

  // --- Throttle (W/S or mouse wheel) -------------------------------------
  if (input.throttleUp) state.throttle = Math.min(1, state.throttle + dt * 0.45);
  if (input.throttleDown) state.throttle = Math.max(0, state.throttle - dt * 0.45);
  if (input.wheelDelta !== 0) {
    state.throttle = Math.max(0, Math.min(1, state.throttle + input.wheelDelta * 0.0012));
    input.wheelDelta = 0;
  }

  // --- Grounded: rollout, taxi and take-off --------------------------------
  // After a landing the plane stays on the strip: it rolls out to a stop,
  // never stalls and never crashes for being on the ground. Hold W to
  // accelerate again; past 110 km/h it lifts off.
  if (state.onGround) {
    const targetSpeed = WORLD.minSpeed + state.throttle * (WORLD.cruiseSpeed - WORLD.minSpeed);
    if (state.throttle > 0.4) {
      state.speed += (targetSpeed - state.speed) * Math.min(1, dt * 0.55);
    } else {
      state.speed += (0 - state.speed) * Math.min(1, dt * 0.8);
    }
    state.speed = Math.max(0, Math.min(WORLD.maxSpeed, state.speed));
    state.pitch = 0;
    state.bank = 0;
    state.verticalSpeed = 0;
    const speedMs = (state.speed * 1000) / 3600;
    const headingRad = state.heading * DEG;
    state.x += Math.sin(headingRad) * speedMs * dt;
    state.z += Math.cos(headingRad) * speedMs * dt;
    // Ease onto the ground under the plane instead of snapping to it.
    const groundY = terrainHeight(state, state.x, state.z) + 2;
    state.y += (groundY - state.y) * Math.min(1, dt * 2);
    if (state.throttle > 0.4 && state.speed > 110) {
      state.onGround = false;
      state.landed = false;
      showMessage(state, 'Lepas landas!', 2);
    }
    state.elapsed += dt;
    return;
  }

  // --- Pitch and bank ------------------------------------------------------
  // Keyboard pitch-down is gentle enough to land on: -8° gives about
  // -5.7 m/s at 165 km/h, inside the gentle-landing band (was -12°, which
  // always slammed the plane into the hard band).
  const pitchTarget = (input.pitchUp ? 14 : 0) + (input.pitchDown ? -8 : 0)
    + (input.mouseActive ? -input.mouseY * 12 : 0);
  const bankTarget = (input.bankRight ? 32 : 0) + (input.bankLeft ? -32 : 0)
    + (input.mouseActive ? input.mouseX * 34 : 0);
  state.pitch += (pitchTarget - state.pitch) * Math.min(1, dt * 3.2);
  state.bank += (bankTarget - state.bank) * Math.min(1, dt * 3.0);
  if (!input.pitchUp && !input.pitchDown && !input.mouseActive) {
    state.pitch += (0 - state.pitch) * Math.min(1, dt * 1.6);
  }
  if (!input.bankLeft && !input.bankRight && !input.mouseActive) {
    state.bank += (0 - state.bank) * Math.min(1, dt * 1.8);
  }

  // --- Speed ---------------------------------------------------------------
  const targetSpeed = WORLD.minSpeed + state.throttle * (WORLD.cruiseSpeed - WORLD.minSpeed);
  state.speed += (targetSpeed - state.speed) * Math.min(1, dt * 0.55);
  // Drag in a hard bank costs speed; a dive buys a little back. The dive
  // bonus is kept modest (0.15, not more): any stronger and a pitch-down
  // descent accelerates past the gentle-landing band on its own.
  state.speed -= Math.abs(state.bank) * 0.04 * dt * 10;
  state.speed += Math.max(0, -state.pitch) * 0.15 * dt * 10;
  state.speed = Math.max(40, Math.min(WORLD.maxSpeed, state.speed));

  // --- Crosswind eases off close to the ground, so the final approach
  // stays correctable instead of blowing the plane off the strip.
  const groundHere = terrainHeight(state, state.x, state.z);
  const aglHere = Math.max(0, state.y - groundHere);
  const windFactor = aglHere > 150 ? 1 : aglHere < 60 ? 0.5 : 0.5 + (aglHere - 60) / 180;
  const effectiveCrosswind = state.crosswind * windFactor;

  // --- Heading and position --------------------------------------------------
  const turnRate = state.bank * 0.55 * (state.speed / WORLD.cruiseSpeed);
  state.heading += turnRate * dt;
  if (state.heading > 180) state.heading -= 360;
  if (state.heading < -180) state.heading += 360;
  const speedMs = (state.speed * 1000) / 3600;
  const headingRad = state.heading * DEG;
  const forwardX = Math.sin(headingRad) * speedMs;
  const forwardZ = Math.cos(headingRad) * speedMs;
  state.x += (forwardX + effectiveCrosswind) * dt;
  state.z += forwardZ * dt;

  // --- Climb / sink -----------------------------------------------------------
  const stalled = state.speed < WORLD.stallSpeed;
  const climbRate = stalled
    ? -14
    : Math.sin(state.pitch * DEG) * speedMs * 0.9;
  state.verticalSpeed = climbRate;
  state.y += climbRate * dt;
  if (state.y > WORLD.maxAltitude) {
    state.y = WORLD.maxAltitude;
    state.pitch = Math.min(state.pitch, 0);
  }
  if (stalled && !state.onGround && !state.stallWarned) {
    state.stallWarned = true;
    showMessage(state, 'STALL! Tambah throttle!', 1.6);
  }
  if (!stalled) state.stallWarned = false;

  // --- Fuel ------------------------------------------------------------------
  state.fuel -= WORLD.fuelDrain * (0.25 + state.throttle) * dt;
  if (state.fuel <= 0) {
    state.fuel = 0;
    state.throttle = 0;
    if (state.y <= 2) {
      state.screen = 'outoffuel';
      state.crashReason = 'Bahan bakar habis di tengah laut.';
    }
  }

  // --- Ground contact ----------------------------------------------------------
  const ground = terrainHeight(state, state.x, state.z);
  const runway = runwayUnder(state, state.x, state.z);
  if (state.y <= ground + 1.5) {
    const gentle = state.verticalSpeed > -6 && state.speed < 210;
    if (runway && gentle && Math.abs(state.bank) < 18) {
      landPlane(state, runway);
    } else if (runway && state.verticalSpeed <= -6 && state.verticalSpeed > -11 && state.speed < 230) {
      // Hard landing: it counts, but it hurts the airframe.
      state.damage += 25;
      state.y = ground + 2;
      state.verticalSpeed = 2;
      state.speed *= 0.55;
      showMessage(state, 'Mendarat keras! Kerusakan +' + 25 + '%', 2);
      if (state.damage >= 100) {
        state.screen = 'crashed';
        state.crashReason = 'Rangka pesawat rusak parah setelah pendaratan keras.';
      } else {
        landPlane(state, runway, true);
      }
    } else {
      state.screen = 'crashed';
      state.crashReason = ground > 2
        ? 'Menabrak daratan ' + nearestIslandName(state) + '.'
        : 'Mendarat di laut — pesawat tenggelam.';
    }
  }

  // --- Damage from a stall into the sea is handled above; nothing else here. ---
  state.elapsed += dt;
}

function nearestIslandName(state) {
  let best = null;
  let bestD = Infinity;
  for (const island of state.islands) {
    const dx = state.x - island.x;
    const dz = state.z - island.z;
    const d = dx * dx + dz * dz;
    if (d < bestD) { bestD = d; best = island; }
  }
  return best ? best.name : '';
}

function landPlane(state, runway, hard) {
  state.y = runway.groundY + 2;
  state.speed = Math.max(60, state.speed * 0.35);
  state.pitch = 0;
  state.bank = 0;
  state.throttle = 0;
  state.verticalSpeed = 0;
  // Grounded: the plane now rolls out on the strip instead of stalling
  // back into the runway a fraction of a second after touching down.
  state.onGround = true;
  // Dust puff at the touchdown point, drawn for ~1 s.
  state.dust = { x: state.x, z: state.z, until: state.elapsed + 1.0 };
  state.fuel = WORLD.fuelTank;
  state.landed = true;
  state.landingQuality = hard ? 'keras' : 'mulus';
  if (state.mission && state.mission.type === 'land') {
    addScore(state, 400, 'Mendarat ' + state.landingQuality + ' di ' + runway.island.name + '! +400');
    state.mission.done = true;
  } else {
    showMessage(state, 'Mendarat ' + state.landingQuality + ' — tangki diisi penuh.', 2.5);
  }
}
