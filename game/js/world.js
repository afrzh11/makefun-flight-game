// World generation for Nusantara Skies: a seeded endless archipelago.
// Islands, target rings and clouds are placed along the +z route and
// recycled ahead of the plane once it flies past them, so the route never ends.
import { WORLD } from './state.js';

// Small deterministic RNG (mulberry32) so demo screenshots are reproducible.
export function makeRng(seed) {
  let a = seed >>> 0;
  return function rng() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const ISLAND_NAMES = [
  'Pulau Komodo', 'Pulau Banda', 'Pulau Derawan', 'Pulau Wakatobi',
  'Pulau Raja Ampat', 'Pulau Togean', 'Pulau Karimunjawa', 'Pulau Belitung',
  'Pulau Flores', 'Pulau Lombok', 'Pulau Sumbawa', 'Pulau Morotai',
];

const ISLAND_KINDS = ['green', 'volcano', 'sand', 'green', 'volcano', 'green'];

export function makeIsland(rng, z, id) {
  const kind = ISLAND_KINDS[Math.floor(rng() * ISLAND_KINDS.length)];
  const radius = 150 + rng() * 130;
  const height = kind === 'volcano' ? 150 + rng() * 90 : 55 + rng() * 70;
  const island = {
    id,
    name: ISLAND_NAMES[id % ISLAND_NAMES.length],
    kind,
    x: (rng() - 0.5) * 900,
    z,
    radius,
    height,
    runway: rng() < 0.55,
    // runway heading in degrees, small offset from route direction
    runwayHeading: (rng() - 0.5) * 24,
    // decorative palms / huts count, drawn from the seed
    palms: 3 + Math.floor(rng() * 6),
    seed: Math.floor(rng() * 1e9),
  };
  return island;
}

export function makeRing(rng, z, y, x) {
  return {
    x: x ?? (rng() - 0.5) * 420,
    y: y ?? 120 + rng() * 220,
    z,
    radius: WORLD.ringRadius,
    hit: false,
    passed: false,
    hue: 38 + Math.floor(rng() * 10),
  };
}

export function makeCloud(rng, z) {
  return {
    x: (rng() - 0.5) * 1400,
    y: 260 + rng() * 320,
    z,
    size: 60 + rng() * 130,
    drift: 2 + rng() * 5,
    shade: 0.82 + rng() * 0.18,
  };
}

export function buildWorld(state, seed) {
  const rng = makeRng(seed || 1);
  state.islands = [];
  state.rings = [];
  state.clouds = [];
  let z = 950;
  for (let i = 0; i < 9; i++) {
    state.islands.push(makeIsland(rng, z, state.nextIslandId++));
    z += 700 + rng() * 300;
  }
  // Rings are placed in the gaps between islands.
  z = 900;
  for (let i = 0; i < 14; i++) {
    state.rings.push(makeRing(rng, z));
    z += 480 + rng() * 260;
  }
  for (let i = 0; i < 26; i++) {
    state.clouds.push(makeCloud(rng, 300 + rng() * 6000));
  }
}

// Terrain height (metres above sea) at a world (x, z) point.
// Sea is 0; each island is a smooth dome, flat-topped where a runway sits.
export function terrainHeight(state, x, z) {
  let h = 0;
  for (const island of state.islands) {
    const dx = x - island.x;
    const dz = z - island.z;
    const d = Math.sqrt(dx * dx + dz * dz);
    if (d >= island.radius) continue;
    const fall = 1 - d / island.radius;
    let dome = island.height * fall * fall;
    if (island.runway) {
      // Flatten a strip along the runway heading so landings read as flat.
      const along = Math.abs(dx * Math.sin((island.runwayHeading * Math.PI) / 180)
        + dz * Math.cos((island.runwayHeading * Math.PI) / 180));
      const across = Math.abs(dx * Math.cos((island.runwayHeading * Math.PI) / 180)
        - dz * Math.sin((island.runwayHeading * Math.PI) / 180));
      if (along < WORLD.runwayLength / 2 && across < WORLD.runwayWidth / 2 + 30) {
        dome = Math.min(dome, island.height * 0.92);
        dome = Math.max(dome, island.height * 0.55);
      }
    }
    if (dome > h) h = dome;
  }
  return h;
}

// The island whose runway the plane is currently over (if any).
export function runwayUnder(state, x, z) {
  for (const island of state.islands) {
    if (!island.runway) continue;
    const dx = x - island.x;
    const dz = z - island.z;
    const heading = (island.runwayHeading * Math.PI) / 180;
    const along = dx * Math.sin(heading) + dz * Math.cos(heading);
    const across = dx * Math.cos(heading) - dz * Math.sin(heading);
    if (Math.abs(along) < WORLD.runwayLength / 2 && Math.abs(across) < WORLD.runwayWidth / 2) {
      return { island, along, across, groundY: island.height * 0.92 };
    }
  }
  return null;
}

// Recycle anything the plane has flown well past, spawning it far ahead.
export function recycleWorld(state, rng) {
  const ahead = state.z + 5200;
  for (const island of state.islands) {
    if (island.z < state.z - 600) {
      const fresh = makeIsland(rng, ahead + rng() * 400, state.nextIslandId++);
      Object.assign(island, fresh);
    }
  }
  for (const ring of state.rings) {
    if (ring.z < state.z - 300) {
      const fresh = makeRing(rng, ahead + rng() * 500);
      Object.assign(ring, fresh);
    }
  }
  for (const cloud of state.clouds) {
    if (cloud.z < state.z - 400) {
      const fresh = makeCloud(rng, ahead + rng() * 800);
      Object.assign(cloud, fresh);
    }
  }
}
