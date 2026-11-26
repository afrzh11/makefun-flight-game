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
    ring.x = 10;
    ring.y = 185;
    ring.course = true;
    placeBeforeRing(state, state.rings.indexOf(ring), 300);
    state.ringsTotal = 6;
    state.ringsHit = 2;
    state.mission.text = 'Terbang melewati 6 cincin!';
    state.missionTimeLimit = 150;
    state.message = 'Cincin 3/6!';
    state.messageUntil = 99;
  } else if (shot === 'rings') {
    const ring = state.rings[4];
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
    state.ringsTotal = 6;
    state.ringsHit = 3;
    state.mission.text = 'Terbang melewati 6 cincin!';
    state.missionTimeLimit = 150;
    state.message = 'Cincin 4/6!';
    state.messageUntil = 99;
  } else if (shot === 'landing') {
    const island = state.islands.find((i) => i.runway) || state.islands[1];
    state.mission = {
      type: 'land', name: 'Mendarat di Pulau', island,
      text: 'Mendarat di landasan ' + island.name + '!',
    };
    state.x = island.x - 30;
    state.y = island.height * 0.92 + 55;
    state.z = island.z - 420;
    state.heading = island.runwayHeading;
    state.pitch = -4;
    state.bank = 3;
    state.speed = 165;
    state.throttle = 0.3;
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
    state.x = zone.x + 30;
    state.y = zone.y + 60;
    state.z = zone.z - 520;
    state.heading = 4;
    state.pitch = -2;
    state.bank = 8;
    state.speed = 190;
    state.throttle = 0.55;
    state.fuel = 52;
    state.missionTimeLimit = 130;
    state.message = 'Zona drop di depan — siap-siap!';
    state.messageUntil = 99;
    state.dusk = true;
  }
}
