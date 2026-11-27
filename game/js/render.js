// Scene rendering for Nusantara Skies: draws the world (sky, sea, clouds,
// islands, rings), the aircraft, the HUD and the title / pause / end
// screens, in that order, every frame.
import { createProjector, drawSky, drawSea, drawClouds, drawIslands, drawRings, drawCargo, drawDust } from './terrain.js';
import { drawAircraft } from './aircraft.js';
import { drawHUD } from './hud.js';

// Crash shake bookkeeping: when the screen first becomes 'crashed'.
let lastScreen = null;
let crashStartTime = 0;

function drawTitle(ctx, w, h, state, time) {
  // A living backdrop: the world scrolls gently behind the title.
  const demo = { ...state, screen: 'flying', z: state.z + time * 12, elapsed: 20 };
  drawWorld(ctx, w, h, demo, time);
  ctx.fillStyle = 'rgba(6,18,30,0.45)';
  ctx.fillRect(0, 0, w, h);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd23e';
  ctx.font = 'bold 64px Arial, sans-serif';
  ctx.fillText('NUSANTARA SKIES', w / 2, h * 0.3);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 22px Arial, sans-serif';
  ctx.fillText('Pilot bush antar-pulau · terbang, mendarat, antar kargo', w / 2, h * 0.3 + 40);
  ctx.font = '16px Arial, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.fillText('W/S throttle · ↑↓ pitch · ←→ belok · mouse: tahan + gerakkan · Spasi: drop kargo', w / 2, h * 0.52);
  ctx.fillText('Misi berganti: Cincin Langit → Mendarat di Pulau → Antar Kargo · jaga bahan bakar!', w / 2, h * 0.52 + 26);
  const pulse = 0.65 + Math.sin(time * 3) * 0.35;
  ctx.fillStyle = 'rgba(255,210,62,' + pulse.toFixed(2) + ')';
  ctx.font = 'bold 26px Arial, sans-serif';
  ctx.fillText('Tekan ENTER untuk terbang', w / 2, h * 0.66);
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.font = '14px Arial, sans-serif';
  ctx.fillText('P jeda · M suara · R ulangi · game original, semua gambar & suara dibuat di dalam game', w / 2, h * 0.74);
}

function drawWorld(ctx, w, h, state, time) {
  const dusk = !!state.dusk;
  const proj = createProjector(state, w, h);
  drawSky(ctx, w, h, state, dusk);
  drawClouds(ctx, proj, state, time);
  drawSea(ctx, w, h, proj, state, time, dusk);
  drawIslands(ctx, proj, state, time);
  drawRings(ctx, proj, state);
  drawCargo(ctx, proj, state);
  drawDust(ctx, proj, state);
  drawAircraft(ctx, w, h, state, time);
}

function drawEndScreen(ctx, w, h, state, title, lines) {
  ctx.fillStyle = 'rgba(6,18,30,0.55)';
  ctx.fillRect(0, 0, w, h);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd23e';
  ctx.font = 'bold 52px Arial, sans-serif';
  ctx.fillText(title, w / 2, h * 0.32);
  ctx.fillStyle = '#ffffff';
  ctx.font = '20px Arial, sans-serif';
  lines.forEach((line, i) => {
    ctx.fillText(line, w / 2, h * 0.32 + 44 + i * 32);
  });
  const pulse = 0.65 + Math.sin(state.elapsed * 3) * 0.35;
  ctx.fillStyle = 'rgba(255,210,62,' + pulse.toFixed(2) + ')';
  ctx.font = 'bold 24px Arial, sans-serif';
  ctx.fillText('Tekan ENTER untuk terbang lagi · R ulangi', w / 2, h * 0.32 + 44 + lines.length * 32 + 30);
}

export function renderFrame(ctx, w, h, state, time) {
  ctx.clearRect(0, 0, w, h);
  if (state.screen === 'title') {
    lastScreen = state.screen;
    drawTitle(ctx, w, h, state, time);
    return;
  }
  // Crash shake: the world jolts for ~0.4 s after the plane goes down,
  // while the HUD stays steady.
  let shakeX = 0, shakeY = 0;
  if (state.screen === 'crashed') {
    if (lastScreen !== 'crashed') crashStartTime = time;
    const age = time - crashStartTime;
    if (age < 0.4) {
      const mag = 6 * (1 - age / 0.4);
      shakeX = (Math.random() - 0.5) * 2 * mag;
      shakeY = (Math.random() - 0.5) * 2 * mag;
    }
  }
  lastScreen = state.screen;
  ctx.save();
  ctx.translate(shakeX, shakeY);
  drawWorld(ctx, w, h, state, time);
  ctx.restore();
  if (state.screen === 'paused') {
    ctx.fillStyle = 'rgba(6,18,30,0.5)';
    ctx.fillRect(0, 0, w, h);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 48px Arial, sans-serif';
    ctx.fillText('JEDA', w / 2, h * 0.42);
    ctx.font = '18px Arial, sans-serif';
    ctx.fillText('Tekan P untuk lanjut · R untuk ulangi dari awal', w / 2, h * 0.42 + 36);
    return;
  }
  drawHUD(ctx, w, h, state);
  if (state.screen === 'crashed') {
    drawEndScreen(ctx, w, h, state, 'PESAWAT JATUH', [
      state.crashReason,
      'Skor: ' + state.score + ' · Level ' + state.level,
    ]);
  } else if (state.screen === 'outoffuel') {
    drawEndScreen(ctx, w, h, state, 'BAHAN BAKAR HABIS', [
      state.crashReason,
      'Skor: ' + state.score + ' · Level ' + state.level,
      'Tips: mendarat di landasan pulau mengisi tangki penuh.',
    ]);
  } else if (state.screen === 'complete') {
    drawEndScreen(ctx, w, h, state, 'WAKTU HABIS', [
      state.crashReason,
      'Skor: ' + state.score + ' · Level ' + state.level,
    ]);
  }
}
