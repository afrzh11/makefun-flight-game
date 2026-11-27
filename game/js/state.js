// Game state for Nusantara Skies: one bush-pilot sortie over the Indonesian
// archipelago. All distances are metres, speeds km/h, angles degrees.
// The plane flies forward along +z; the camera chases 30 m behind it.
export const WORLD = {
  seaLevel: 0,
  maxAltitude: 700,
  cruiseSpeed: 300,
  stallSpeed: 95,
  maxSpeed: 340,
  minSpeed: 60,
  fuelDrain: 0.42, // % per second at full throttle
  fuelTank: 100,
  ringRadius: 36,
  runwayWidth: 46,
  runwayLength: 260,
};

export function createGameState() {
  return {
    // Flight
    x: 0, y: 180, z: 0,
    speed: 170,
    throttle: 0.55,
    pitch: 0, // degrees, + climbs
    bank: 0, // degrees, + banks right
    heading: 0, // degrees, 0 = due north along +z
    verticalSpeed: 0,
    fuel: 100,
    damage: 0,
    // Run
    score: 0,
    level: 1,
    missionIndex: 0,
    mission: null,
    missionTime: 0,
    missionTimeLimit: 150,
    ringsHit: 0,
    ringsTotal: 0,
    landed: false,
    onGround: false, // true while rolling on a runway after a landing
    // Flow
    screen: 'title', // title | flying | paused | crashed | outoffuel | complete | landed
    message: '',
    messageUntil: 0,
    elapsed: 0,
    crosswind: 0, // m/s lateral push, grows with level
    // World (filled by world.js)
    islands: [],
    rings: [],
    clouds: [],
    nextIslandId: 1,
    // Crash / landing detail
    crashReason: '',
    landingQuality: '',
    dropDone: false,
    cargoDropped: false,
    cargoFalling: null, // {x, y, z, vy, landed} while a dropped crate falls
    dust: null, // {x, z, until} dust puff kicked up by a touchdown
    // Demo hooks
    shot: null,
    seed: 1,
  };
}

export function resetRun(state) {
  const keepScreen = state.screen;
  const fresh = createGameState();
  fresh.screen = keepScreen;
  fresh.shot = state.shot;
  fresh.seed = state.seed;
  Object.assign(state, fresh);
}

export function showMessage(state, text, seconds = 2.5) {
  state.message = text;
  state.messageUntil = state.elapsed + seconds;
}

export function addScore(state, points, label) {
  state.score += points;
  if (label) showMessage(state, label);
}
