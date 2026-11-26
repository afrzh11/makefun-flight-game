// HUD for Nusantara Skies: altitude, speed and heading in big readable
// numerals, a compass strip, lit instruments (attitude ball, fuel and
// damage gauges, throttle), mission objective and message toasts. Panels
// are dark and translucent so the numbers read when the screenshot shrinks.
import { WORLD } from './state.js';

function panel(ctx, x, y, w, h) {
  ctx.fillStyle = 'rgba(8,20,32,0.62)';
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 8);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.22)';
  ctx.lineWidth = 1;
  ctx.stroke();
}

function label(ctx, text, x, y) {
  ctx.fillStyle = '#9fd8f5';
  ctx.font = 'bold 11px Arial, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(text, x, y);
}

function bigValue(ctx, text, x, y, color) {
  ctx.fillStyle = color || '#ffffff';
  ctx.font = 'bold 30px Arial, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(text, x, y);
}

function drawCompass(ctx, w, state) {
  const cx = w / 2;
  const y = 18;
  panel(ctx, cx - 190, 8, 380, 44);
  const points = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  ctx.save();
  ctx.beginPath();
  ctx.rect(cx - 184, 12, 368, 36);
  ctx.clip();
  for (let d = -180; d <= 540; d += 15) {
    let rel = d - state.heading;
    while (rel > 180) rel -= 360;
    while (rel < -180) rel += 360;
    const x = cx + rel * 1.5;
    if (x < cx - 190 || x > cx + 190) continue;
    const major = ((d % 45) + 360) % 45 === 0;
    ctx.strokeStyle = major ? '#ffffff' : 'rgba(255,255,255,0.45)';
    ctx.lineWidth = major ? 2 : 1;
    ctx.beginPath();
    ctx.moveTo(x, 22);
    ctx.lineTo(x, major ? 34 : 29);
    ctx.stroke();
    if (major) {
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px Arial, sans-serif';
      ctx.textAlign = 'center';
      const norm = ((d % 360) + 360) % 360;
      ctx.fillText(points[Math.round(norm / 45) % 8], x, 46);
    }
  }
  ctx.restore();
  // Heading caret + digital readout.
  ctx.fillStyle = '#ffd23e';
  ctx.beginPath();
  ctx.moveTo(cx - 7, 10);
  ctx.lineTo(cx + 7, 10);
  ctx.lineTo(cx, 20);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#ffd23e';
  ctx.font = 'bold 12px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(Math.round(((state.heading % 360) + 360) % 360) + '°', cx, 62);
}

function drawAttitude(ctx, x, y, r, state) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.clip();
  ctx.translate(x, y);
  ctx.rotate((-state.bank * Math.PI) / 180);
  ctx.translate(0, state.pitch * 1.1);
  // Sky half / ground half.
  ctx.fillStyle = '#3d9bd6';
  ctx.fillRect(-r, -r * 2, r * 2, r * 2);
  ctx.fillStyle = '#8a5a2e';
  ctx.fillRect(-r, 0, r * 2, r * 2);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-r, 0);
  ctx.lineTo(r, 0);
  ctx.stroke();
  ctx.restore();
  // Fixed wings marker + rim.
  ctx.strokeStyle = '#ffd23e';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x - r - 2, y);
  ctx.lineTo(x - r + 10, y);
  ctx.moveTo(x + r - 10, y);
  ctx.lineTo(x + r + 2, y);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = '#9fd8f5';
  ctx.font = 'bold 10px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('ATT', x, y + r + 13);
}

function drawGauge(ctx, x, y, w, h, frac, color, labelText) {
  panel(ctx, x, y, w, h + 16);
  ctx.fillStyle = 'rgba(255,255,255,0.14)';
  ctx.fillRect(x + 8, y + 8, w - 16, h - 8);
  ctx.fillStyle = color;
  ctx.fillRect(x + 8, y + 8, (w - 16) * Math.max(0, Math.min(1, frac)), h - 8);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 11px Arial, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(labelText, x + 8, y + h + 12);
}

export function drawHUD(ctx, w, h, state) {
  // --- Top-left: ALT / SPD ---------------------------------------------------
  panel(ctx, 14, 12, 218, 124);
  label(ctx, 'ALTITUDE', 26, 32);
  bigValue(ctx, Math.round(state.y) + ' m', 26, 60);
  label(ctx, 'SPEED', 26, 88);
  bigValue(ctx, Math.round(state.speed) + ' km/h', 26, 116,
    state.speed < 95 ? '#ff6b5e' : '#ffffff');

  // --- Top-right: score / mission / timer ------------------------------------
  panel(ctx, w - 232, 12, 218, 124);
  label(ctx, 'SCORE', w - 220, 32);
  bigValue(ctx, String(state.score), w - 220, 60, '#ffd23e');
  label(ctx, 'MISSION', w - 220, 88);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 13px Arial, sans-serif';
  ctx.textAlign = 'left';
  const missionName = state.mission ? state.mission.name : '—';
  ctx.fillText(missionName + '  ·  Lv ' + state.level, w - 220, 112);

  // --- Compass -----------------------------------------------------------------
  drawCompass(ctx, w, state);

  // --- Mission objective line -----------------------------------------------------
  if (state.mission) {
    ctx.font = 'bold 15px Arial, sans-serif';
    ctx.textAlign = 'center';
    const text = state.mission.text;
    const tw = ctx.measureText(text).width;
    panel(ctx, w / 2 - tw / 2 - 14, 74, tw + 28, 28);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(text, w / 2, 93);
  }

  // --- Timer + fuel warning -------------------------------------------------------
  const timeLeft = Math.max(0, Math.ceil(state.missionTimeLimit - state.missionTime));
  ctx.font = 'bold 15px Arial, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillStyle = timeLeft < 30 ? '#ff6b5e' : '#ffffff';
  ctx.fillText('⏱ ' + Math.floor(timeLeft / 60) + ':' + String(timeLeft % 60).padStart(2, '0'), w - 16, 156);

  // --- Bottom-left: instruments -----------------------------------------------------
  panel(ctx, 14, h - 128, 300, 114);
  drawAttitude(ctx, 58, h - 76, 34, state);
  drawGauge(ctx, 108, h - 118, 92, 14, state.fuel / 100,
    state.fuel < 25 ? '#ff6b5e' : '#35e05a', 'FUEL ' + Math.round(state.fuel) + '%');
  drawGauge(ctx, 108, h - 88, 92, 14, 1 - state.damage / 100,
    state.damage > 60 ? '#ff6b5e' : '#ffb02e', 'DMG ' + Math.round(state.damage) + '%');
  drawGauge(ctx, 108, h - 58, 92, 14, state.throttle,
    '#37b6ff', 'THR ' + Math.round(state.throttle * 100) + '%');
  // Vertical speed readout.
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 12px Arial, sans-serif';
  ctx.textAlign = 'left';
  const vs = state.verticalSpeed;
  ctx.fillText('V/S ' + (vs >= 0 ? '+' : '') + vs.toFixed(1) + ' m/s', 214, h - 96);
  // Crosswind.
  const windDir = state.crosswind >= 0 ? '→' : '←';
  ctx.fillStyle = '#9fd8f5';
  ctx.fillText('Angin ' + windDir + ' ' + Math.abs(state.crosswind).toFixed(0) + ' m/s', 214, h - 72);
  // Stall warning.
  if (state.speed < 95 && state.screen === 'flying') {
    ctx.fillStyle = '#ff6b5e';
    ctx.font = 'bold 20px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('⚠ STALL — TAMBAH THROTTLE', w / 2, h - 150);
  }

  // --- Centre message toast ---------------------------------------------------------
  if (state.message && state.elapsed < state.messageUntil) {
    ctx.font = 'bold 22px Arial, sans-serif';
    ctx.textAlign = 'center';
    const tw = ctx.measureText(state.message).width;
    panel(ctx, w / 2 - tw / 2 - 16, h * 0.24, tw + 32, 40);
    ctx.fillStyle = '#ffd23e';
    ctx.fillText(state.message, w / 2, h * 0.24 + 27);
  }

  // --- Controls hint (flying only, fades after 12 s) --------------------------------
  if (state.screen === 'flying' && state.elapsed < 12) {
    ctx.font = '13px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.fillText('W/S throttle · ↑↓ pitch · ←→ belok · mouse: tahan + gerakkan · Spasi: drop kargo · P jeda · M suara', w / 2, h - 14);
  }
}
