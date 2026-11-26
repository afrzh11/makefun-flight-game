// Terrain drawing for Nusantara Skies: sky, sea, islands, runways, rings
// and clouds in a pseudo-3D chase view. One shared projector turns world
// metres into screen pixels; everything far-to-near so near things overlap far.
import { WORLD } from './state.js';

const DEG = Math.PI / 180;

// A projector for one frame: camera chases 30 m behind the plane.
export function createProjector(state, w, h) {
  const cx = w / 2;
  const horizonY = h * 0.44 + state.pitch * 2.4;
  const camX = state.x;
  const camY = state.y + 6;
  const camZ = state.z - 30;
  const tanH = Math.tan(state.heading * DEG);
  return {
    cx, horizonY, camX, camY, camZ, tanH,
    project(x, y, z) {
      const dz = z - camZ;
      if (dz < 8) return null;
      const persp = 900 / (dz + 260);
      return {
        x: cx + (x - camX + dz * tanH) * persp,
        y: horizonY - (y - camY) * persp,
        s: persp,
        dz,
      };
    },
  };
}

export function drawSky(ctx, w, h, state, dusk) {
  const g = ctx.createLinearGradient(0, 0, 0, h * 0.55);
  if (dusk) {
    g.addColorStop(0, '#2b3a6e');
    g.addColorStop(0.55, '#c96a4a');
    g.addColorStop(1, '#f7b267');
  } else {
    g.addColorStop(0, '#1d6fb8');
    g.addColorStop(0.55, '#5fb2e8');
    g.addColorStop(1, '#cfeefb');
  }
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h * 0.56);
  // Sun with a soft glow.
  const sunX = w * 0.78;
  const sunY = h * 0.16;
  const glow = ctx.createRadialGradient(sunX, sunY, 4, sunX, sunY, 90);
  glow.addColorStop(0, 'rgba(255,244,200,0.95)');
  glow.addColorStop(0.25, 'rgba(255,220,130,0.55)');
  glow.addColorStop(1, 'rgba(255,220,130,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(sunX - 95, sunY - 95, 190, 190);
  ctx.fillStyle = '#fff6cf';
  ctx.beginPath();
  ctx.arc(sunX, sunY, 26, 0, Math.PI * 2);
  ctx.fill();
}

export function drawSea(ctx, w, h, proj, state, time, dusk) {
  const top = proj.horizonY;
  const g = ctx.createLinearGradient(0, top, 0, h);
  if (dusk) {
    g.addColorStop(0, '#7a5a8c');
    g.addColorStop(0.35, '#2e5f7a');
    g.addColorStop(1, '#123a52');
  } else {
    g.addColorStop(0, '#3fa7c9');
    g.addColorStop(0.35, '#1d7ba6');
    g.addColorStop(1, '#0b4a6b');
  }
  ctx.fillStyle = g;
  ctx.fillRect(0, top, w, h - top);
  // Sun glitter: short horizontal sparkles that drift with time.
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 46; i++) {
    const yy = top + 14 + ((i * 67 + time * 22) % (h - top - 20));
    const xx = ((i * 173 + time * 9) % (w + 120)) - 60;
    const len = 14 + (i % 5) * 9;
    ctx.globalAlpha = 0.12 + (i % 4) * 0.07;
    ctx.beginPath();
    ctx.moveTo(xx, yy);
    ctx.lineTo(xx + len, yy);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  // Horizon line.
  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, top);
  ctx.lineTo(w, top);
  ctx.stroke();
}

export function drawClouds(ctx, proj, state, time) {
  const list = state.clouds.slice().sort((a, b) => b.z - a.z);
  for (const cloud of list) {
    const p = proj.project(cloud.x + Math.sin(time * 0.05 + cloud.z) * 8, cloud.y, cloud.z);
    if (!p) continue;
    const s = p.s * cloud.size;
    if (s < 4) continue;
    ctx.fillStyle = 'rgba(255,255,255,' + (0.55 * cloud.shade).toFixed(2) + ')';
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, s, s * 0.36, 0, 0, Math.PI * 2);
    ctx.ellipse(p.x - s * 0.55, p.y + s * 0.08, s * 0.6, s * 0.28, 0, 0, Math.PI * 2);
    ctx.ellipse(p.x + s * 0.55, p.y + s * 0.06, s * 0.62, s * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawIslandShape(ctx, p, island, time) {
  const baseW = island.radius * 2 * p.s;
  const topH = island.height * p.s;
  const baseY = p.y;
  if (baseW < 6) return;
  // Sand ring at the waterline.
  ctx.fillStyle = '#e8d29a';
  ctx.beginPath();
  ctx.ellipse(p.x, baseY, baseW * 0.52, Math.max(3, baseW * 0.07), 0, 0, Math.PI * 2);
  ctx.fill();
  // Green dome / volcano cone.
  // Rounded dome for every island; a volcano gets a dark crater cap on top
  // instead of a bare brown cone, so near islands still read as islands.
  ctx.beginPath();
  ctx.moveTo(p.x - baseW * 0.48, baseY);
  ctx.bezierCurveTo(
    p.x - baseW * 0.42, baseY - topH * 0.9,
    p.x - baseW * 0.16, baseY - topH * 1.05,
    p.x, baseY - topH,
  );
  ctx.bezierCurveTo(
    p.x + baseW * 0.16, baseY - topH * 1.05,
    p.x + baseW * 0.42, baseY - topH * 0.9,
    p.x + baseW * 0.48, baseY,
  );
  ctx.closePath();
  const grad = ctx.createLinearGradient(p.x, baseY - topH, p.x, baseY);
  if (island.kind === 'volcano') {
    grad.addColorStop(0, '#6b4a38');
    grad.addColorStop(0.35, '#7a5c40');
    grad.addColorStop(0.7, '#4d7a3a');
    grad.addColorStop(1, '#2a5c33');
  } else if (island.kind === 'sand') {
    grad.addColorStop(0, '#c9b078');
    grad.addColorStop(1, '#8fae5a');
  } else {
    grad.addColorStop(0, '#4d8a44');
    grad.addColorStop(0.6, '#35703a');
    grad.addColorStop(1, '#2a5c33');
  }
  ctx.fillStyle = grad;
  ctx.fill();
  // Volcano crater cap: a dark ellipse at the peak.
  if (island.kind === 'volcano') {
    ctx.fillStyle = '#4a382c';
    ctx.beginPath();
    ctx.ellipse(p.x - baseW * 0.01, baseY - topH + Math.max(2, topH * 0.06), baseW * 0.085, Math.max(2, topH * 0.09), 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // Volcano crater smoke.
  if (island.kind === 'volcano') {
    const puff = (Math.sin(time * 0.9 + island.seed) + 1) / 2;
    ctx.fillStyle = 'rgba(240,240,240,0.75)';
    ctx.beginPath();
    ctx.arc(p.x - baseW * 0.01, baseY - topH - 8 - puff * 14, Math.max(4, baseW * 0.05), 0, Math.PI * 2);
    ctx.arc(p.x + baseW * 0.05, baseY - topH - 16 - puff * 18, Math.max(3, baseW * 0.035), 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#e8e0d0';
    ctx.beginPath();
    ctx.ellipse(p.x - baseW * 0.01, baseY - topH + 2, baseW * 0.09, Math.max(2, topH * 0.08), 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // Palm dots on near islands.
  if (baseW > 90) {
    ctx.fillStyle = '#1e4d24';
    for (let i = 0; i < island.palms; i++) {
      const px = p.x + ((i * 37 + island.seed) % 100) / 100 * baseW * 0.7 - baseW * 0.35;
      const py = baseY - topH * (0.25 + ((i * 53 + island.seed) % 60) / 100 * 0.5);
      ctx.beginPath();
      ctx.arc(px, py, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

export function drawIslands(ctx, proj, state, time) {
  const list = state.islands
    .filter((i) => i.z > state.z - 100)
    .sort((a, b) => b.z - a.z);
  for (const island of list) {
    const p = proj.project(island.x, 0, island.z);
    if (!p) continue;
    drawIslandShape(ctx, p, island, time);
    if (island.runway) drawRunway(ctx, proj, island);
  }
}

function drawRunway(ctx, proj, island) {
  // Skip runways on islands right beside or behind the camera: their strip
  // would slash across the bottom of the frame and read as a road on water.
  if (island.z - proj.camZ < 220) return;
  const heading = (island.runwayHeading * Math.PI) / 180;
  const halfL = WORLD.runwayLength / 2;
  const halfW = WORLD.runwayWidth / 2;
  const groundY = island.height * 0.92;
  const sinH = Math.sin(heading);
  const cosH = Math.cos(heading);
  // Four corners of the strip in world space.
  const corners = [
    [island.x - halfW * cosH - halfL * sinH, groundY, island.z - halfW * sinH + halfL * cosH],
    [island.x + halfW * cosH - halfL * sinH, groundY, island.z + halfW * sinH + halfL * cosH],
    [island.x + halfW * cosH + halfL * sinH, groundY, island.z + halfW * sinH - halfL * cosH],
    [island.x - halfW * cosH + halfL * sinH, groundY, island.z - halfW * sinH - halfL * cosH],
  ];
  const pts = corners.map(([x, y, z]) => proj.project(x, y, z));
  if (pts.some((p) => !p)) return;
  ctx.fillStyle = '#3a3f46';
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < 4; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.closePath();
  ctx.fill();
  // Centreline dashes: interpolate along the strip.
  ctx.strokeStyle = '#f5d76e';
  ctx.lineWidth = 2;
  ctx.setLineDash([10, 12]);
  ctx.beginPath();
  const midNear = proj.project(
    island.x - halfL * sinH, groundY, island.z + halfL * cosH,
  );
  const midFar = proj.project(
    island.x + halfL * sinH, groundY, island.z - halfL * cosH,
  );
  if (midNear && midFar) {
    ctx.moveTo(midNear.x, midNear.y);
    ctx.lineTo(midFar.x, midFar.y);
    ctx.stroke();
  }
  ctx.setLineDash([]);
}

export function drawRings(ctx, proj, state) {
  const list = state.rings
    .filter((r) => !r.passed && r.z > state.z)
    .sort((a, b) => b.z - a.z);
  const mission = state.mission;
  const nextCourseRing = mission && mission.type === 'rings'
    ? state.rings.find((r) => r.course && !r.hit && !r.passed)
    : null;
  for (const ring of list) {
    const p = proj.project(ring.x, ring.y, ring.z);
    if (!p) continue;
    const r = ring.radius * p.s;
    if (r < 3) continue;
    const isNext = ring === nextCourseRing;
    const isDrop = ring.dropZone;
    const color = isDrop ? '#ffd23e' : isNext ? '#ff9f2e' : '#37d6e0';
    ctx.save();
    ctx.shadowColor = color;
    ctx.shadowBlur = 18;
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(2, r * 0.14);
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, r, r * 0.92, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    ctx.fillStyle = 'rgba(255,255,255,0.16)';
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, r * 0.86, r * 0.79, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}
