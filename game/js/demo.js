// Deterministic demo scenes for Nusantara Skies: ?shot=cover|rings|landing|cargo
// (with &seed=) places the plane, the world and the mission in a fixed,
// photogenic state so screenshots are real renders of the game's own code
// and reproducible. The cover shows the full game at its best: chase view
// over the archipelago, a glowing ring dead ahead, a runway island beyond
// it, and the whole HUD lit.
import { buildWorld } from './world.js';
import { startMission } from './missions.js';

function placeBeforeRing(state, ringIndex, distance) {
  const ring = state.rings[ringIndex];
  if (!ring) return;
  state.x = ring.x;
  state.y = ring.y;
  state.z = ring.z - (distance || 420);
  state.heading = 0;
  state.pitch = 1;
  state.bank = 0;
  state.speed = 210;
  state.throttle = 0.62;
}

export function applyShot(state, shot, seed) {
  state.shot = shot;
  state.seed = seed;
  buildWorld(state, seed);
  state.screen = 'flying';
  state.elapsed = 8; // past the controls hint fade-in, HUD fully settled
  state.fuel = 78;
  state.damage = 12;
  state.score = 1450;
  state.level = 2;
  state.crosswind = 6;
  state.missionTime = 42;
  startMission(state, 0);

  if (shot === 'cover') {
    // Ring dead ahead, runway island just beyond it, volcano on the left.
    const ring = state.rings.find((r) => r.z > 1200 && Math.abs(r.x) < 120) || state.rings[2];
    // Only this ring is the course ring, so it draws orange and reads as
    // the target dead ahead.
    for (const r of state.rings) r.course = false;
    ring.x = 10;
    ring.y = 185;
    ring.course = true;
    placeBeforeRing(state, state.rings.indexOf(ring), 200);
    // Clear the flight corridor of islands so the plane and the ring read
    // against sky and sea instead of overlapping a dome. The range is long
    // because a tall far island (Derawan, 1.5 km past the ring) still fills
    // the centre of the frame; the islands stay visible off to the sides.
    for (const isl of state.islands) {
      if (Math.abs(isl.x - ring.x) < 350 && isl.z > state.z - 100 && isl.z < ring.z + 2500) {
        isl.x += (isl.x >= ring.x ? 450 : -450);
      }
    }
    state.verticalSpeed = 1.2;
    state.ringsTotal = 6;
    state.ringsHit = 2;
    state.mission.text = 'Terbang melewati 6 cincin!';
    state.missionTimeLimit = 150;
    state.message = 'Cincin 3/6!';
    state.messageUntil = 99;
  } else if (shot === 'rings') {
    const ring = state.rings[4];
    // Only this ring is the course ring, so it draws orange.
    for (const r of state.rings) r.course = false;
    ring.x = 60;
    ring.y = 200;
    ring.course = true;
    state.x = ring.x - 40;
    state.y = ring.y + 12;
    state.z = ring.z - 150;
    state.bank = -18;
    state.heading = -6;
    state.pitch = 2;
    state.speed = 235;
    state.throttle = 0.7;
    state.verticalSpeed = 0.8;
    // Push the nearest island ahead off the flight line so the banked turn
    // and the ring read against sky and sea, not a dome filling the frame.
    const near = state.islands
      .filter((i) => i.z > state.z)
      .sort((a, b) => a.z - b.z)[0];
    if (near) near.x += (near.x >= state.x ? 600 : -600);
    state.ringsTotal = 6;
    state.ringsHit = 3;
    state.mission.text = 'Terbang melewati 6 cincin!';
    state.missionTimeLimit = 150;
    state.message = 'Cincin 4/6!';
    state.messageUntil = 99;
  } else if (shot === 'landing') {
    // Prefer a green (non-volcano) runway island; plane on the centreline
    // ~12 m above the threshold, runway converging to bottom-centre, AGL
    // readout and approach lights visible.
    const island = state.islands.find((i) => i.runway && i.kind !== 'volcano')
      || state.islands.find((i) => i.runway) || state.islands[1];
    // Straighten the runway to due north so the strip projects dead centre
    // in the frame instead of sliding off to one side with the island's
    // random runway heading.
    island.runwayHeading = 0;
    state.mission = {
      type: 'land', name: 'Mendarat di Pulau', island,
      text: 'Mendarat di landasan ' + island.name + '!',
    };
    const hdg = (island.runwayHeading * Math.PI) / 180;
    const sinH = Math.sin(hdg), cosH = Math.cos(hdg);
    const groundY = island.height * 0.92;
    const nearX = island.x - 130 * sinH;
    const nearZ = island.z - 130 * cosH;
    // 120 m before the threshold, 18 m above the strip: the strip reads
    // big and centred, with the approach lights leading into the frame.
    state.x = nearX - 120 * sinH;
    state.z = nearZ - 120 * cosH;
    state.y = groundY + 18;
    state.heading = island.runwayHeading;
    state.pitch = -4;
    state.bank = 0;
    state.speed = 165;
    state.throttle = 0.3;
    state.verticalSpeed = -3.0;
    state.fuel = 34;
    state.missionTimeLimit = 180;
    state.message = 'Final approach — turunkan kecepatan!';
    state.messageUntil = 99;
  } else if (shot === 'cargo') {
    const zone = state.rings.find((r) => r.z > 2000) || state.rings[8];
    zone.dropZone = true;
    zone.x = -20;
    zone.y = 210;
    state.mission = {
      type: 'cargo', name: 'Antar Kargo', dropZone: zone, count: 1,
      text: 'Jatuhkan kargo di zona kuning (tekan Spasi)!',
    };
    // Plane dead on the zone line and closer, so the yellow ring reads big
    // and centred ahead; a crate is already falling toward the zone.
    state.x = zone.x;
    state.y = zone.y + 40;
    state.z = zone.z - 300;
    state.heading = 0;
    state.pitch = -2;
    state.bank = 0;
    state.speed = 190;
    state.throttle = 0.55;
    state.verticalSpeed = -1.5;
    state.fuel = 52;
    state.missionTimeLimit = 130;
    state.message = 'Zona drop di depan — siap-siap!';
    state.messageUntil = 99;
    state.dusk = true;
    state.cargoFalling = { x: zone.x, y: zone.y + 45, z: zone.z - 40, vy: 12, landed: false };
    // Move any runway island near the zone out of frame so its strip does
    // not float on the slope beside the drop.
    for (const isl of state.islands) {
      if (isl.runway && Math.abs(isl.z - zone.z) < 900) isl.x += 520;
    }
  }
}
