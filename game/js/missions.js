// Missions for Nusantara Skies: three sortie types that rotate and get
// harder each level — ring runs, island landings and cargo drops. Fuel and
// damage turn each sortie into decisions, not just steering.
import { WORLD, showMessage, addScore } from './state.js';
import { terrainHeight } from './world.js';

const MISSION_NAMES = {
  rings: 'Cincin Langit',
  land: 'Mendarat di Pulau',
  cargo: 'Antar Kargo',
};

export function startMission(state, index) {
  const type = ['rings', 'land', 'cargo'][index % 3];
  const level = state.level;
  state.missionIndex = index;
  state.missionTime = 0;
  state.dropDone = false;
  state.cargoDropped = false;
  state.cargoFalling = null;
  state.landed = false;
  // Every third level is a dusk leg, so the sunset palette from the cargo
  // screenshot shows up in real play too, not only in staged shots.
  state.dusk = (level % 3 === 0);

  if (type === 'rings') {
    const count = 5 + level;
    state.missionTimeLimit = 110 + level * 10;
    state.ringsTotal = count;
    state.ringsHit = 0;
    // Arm the next `count` rings ahead of the plane as the course.
    const ahead = state.rings.filter((r) => r.z > state.z + 100 && !r.passed);
    ahead.slice(0, count).forEach((r) => { r.course = true; });
    state.mission = {
      type, name: MISSION_NAMES[type], count,
      text: 'Terbang melewati ' + count + ' cincin!',
    };
  } else if (type === 'land') {
    state.missionTimeLimit = 150 + level * 10;
    const target = state.islands.find((i) => i.runway && i.z > state.z + 800)
      || state.islands.find((i) => i.runway);
    state.mission = {
      type, name: MISSION_NAMES[type], island: target || null,
      text: target
        ? 'Mendarat di landasan ' + target.name + '!'
        : 'Cari landasan pulau dan mendarat!',
    };
  } else {
    const count = 1;
    state.missionTimeLimit = 120 + level * 8;
    const drop = state.rings.find((r) => r.z > state.z + 900 && !r.passed);
    if (drop) drop.dropZone = true;
    state.mission = {
      type, name: MISSION_NAMES[type], dropZone: drop || null, count,
      text: 'Jatuhkan kargo di zona kuning (tekan Spasi)!',
    };
  }
  showMessage(state, 'Misi ' + (index + 1) + ': ' + state.mission.name + ' — ' + state.mission.text, 3.5);
}

export function updateMissions(state, dt) {
  if (state.screen !== 'flying' || !state.mission) return;
  state.missionTime += dt;
  const mission = state.mission;

  // --- Ring passes ---------------------------------------------------------
  for (const ring of state.rings) {
    if (ring.passed || ring.hit) continue;
    if (state.z < ring.z) continue;
    ring.passed = true;
    const dx = state.x - ring.x;
    const dy = state.y - ring.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < ring.radius) {
      ring.hit = true;
      if (mission.type === 'rings' && ring.course) {
        state.ringsHit += 1;
        addScore(state, 150, 'Cincin ' + state.ringsHit + '/' + state.ringsTotal + '! +150');
        if (state.ringsHit >= state.ringsTotal) mission.done = true;
      } else if (mission.type === 'cargo' && ring.dropZone) {
        // Flying through the drop zone arms the drop; cargo still needs Space.
        showMessage(state, 'Di atas zona drop — tekan Spasi!', 2);
      } else {
        addScore(state, 50, 'Cincin bonus! +50');
      }
    }
  }

  // --- Falling cargo crate ---------------------------------------------------
  // A dropped crate falls at ~12 m/s and stays on the ground as a marker
  // until the mission advances, so the drop is visible instead of just a toast.
  if (state.cargoFalling && !state.cargoFalling.landed) {
    state.cargoFalling.y -= state.cargoFalling.vy * dt;
    if (state.cargoFalling.y <= terrainHeight(state, state.cargoFalling.x, state.cargoFalling.z) + 1) {
      state.cargoFalling.y = terrainHeight(state, state.cargoFalling.x, state.cargoFalling.z) + 1;
      state.cargoFalling.landed = true;
    }
  }

  // --- Cargo drop ------------------------------------------------------------
  if (mission.type === 'cargo' && state.cargoDropped && !state.dropDone) {
    state.dropDone = true;
    const zone = mission.dropZone;
    if (zone) {
      const dx = state.x - zone.x;
      const dy = state.y - zone.y;
      const dz = state.z - zone.z;
      // Score the drop in 3D: a drop 500 m early must not count just
      // because x/y line up.
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (Math.abs(dz) > 250) {
        showMessage(state, 'Terlalu dini — tunggu sampai di atas zona.', 2.5);
        state.cargoDropped = false;
        state.dropDone = false;
        state.cargoFalling = null;
      } else if (dist < 90) {
        addScore(state, 500, 'Kargo mendarat tepat sasaran! +500');
        mission.done = true;
      } else {
        showMessage(state, 'Kargo meleset ' + Math.round(dist) + ' m dari zona.', 2.5);
        state.cargoDropped = false;
        state.dropDone = false;
      }
    }
  }

  // --- Mission complete / timeout ---------------------------------------------
  if (mission.done) {
    const bonus = Math.max(0, Math.round((state.missionTimeLimit - state.missionTime))) * 2;
    addScore(state, bonus, 'Misi selesai! Bonus waktu +' + bonus);
    state.level += 1;
    state.crosswind = Math.min(14, 2 + state.level * 2);
    startMission(state, state.missionIndex + 1);
    return;
  }
  if (state.missionTime > state.missionTimeLimit) {
    state.screen = 'complete';
    state.crashReason = 'Waktu misi habis — ' + mission.name + ' belum selesai.';
  }
}

// Space drops the cargo when the mission calls for it.
export function dropCargo(state) {
  if (state.screen !== 'flying' || !state.mission) return;
  if (state.mission.type !== 'cargo') return;
  if (state.cargoDropped) return;
  state.cargoDropped = true;
  state.cargoFalling = { x: state.x, y: state.y - 4, z: state.z, vy: 12, landed: false };
  showMessage(state, 'Kargo dijatuhkan!', 1.5);
}
