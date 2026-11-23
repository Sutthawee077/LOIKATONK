import type { KrathongCandleId, KrathongItem } from "@/types/krathong";

export interface WaterSample {
  height: number; // px vertical wave displacement
  slopeX: number; // dimensionless surface slope dH/dx
  slopeY: number; // dimensionless surface slope dH/dy
  flowVx: number; // normalized X units / sec
  flowVy: number; // normalized Y units / sec
}

export interface WaterRippleImpulse {
  id: number;
  xNorm: number;
  yNorm: number;
  createdAtSec: number;
  strength: number;
  maxRadiusNorm: number;
  speed: number;
}

export interface KrathongPhysicsBody {
  id: string;
  candle: KrathongCandleId;
  xNorm: number;
  yNorm: number;
  vx: number;
  vy: number;
  heaveZ: number;
  vz: number;
  roll: number; // degrees
  vRoll: number;
  pitch: number; // degrees
  yawDeg: number; // subtle slow rotational yaw (-6..6 deg)
  flameLean: number; // degrees
  waveSlopeX: number; // cached wave slope for zero-resampling canvas reflections
  lane: number;
  dropSplashUntilSec: number;
}

function hashId(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

/**
 * Perspective scale from river depth yNorm (0 = far Wat Arun bank, 1 = foreground pier).
 */
export function getPerspectiveScale(yNorm: number): number {
  const clamped = Math.min(1, Math.max(0, yNorm));
  return 0.46 + clamped * 0.62;
}

/**
 * Evaluates Chao Phraya surface wave height, wave slopes, and organic meandering river current
 * at normalized river coordinates (xNorm in [0..1], yNorm in [0..1]) and time tSec.
 */
export function sampleWaterWave(
  xNorm: number,
  yNorm: number,
  tSec: number,
  ripples: WaterRippleImpulse[]
): WaterSample {
  // Multi-harmonic directional wave field
  const p1 = xNorm * 9.5 + yNorm * 6.2 - tSec * 1.25;
  const p2 = xNorm * 21.0 - yNorm * 14.5 + tSec * 1.95;
  const p3 = xNorm * 37.0 + yNorm * 23.0 - tSec * 2.85;

  const a1 = 3.2;
  const a2 = 1.6;
  const a3 = 0.75;

  let height =
    a1 * Math.sin(p1) + a2 * Math.sin(p2) + a3 * Math.sin(p3);

  let slopeX =
    (a1 * 9.5 * Math.cos(p1) +
      a2 * 21.0 * Math.cos(p2) +
      a3 * 37.0 * Math.cos(p3)) *
    0.028;

  let slopeY =
    (a1 * 6.2 * Math.cos(p1) -
      a2 * 14.5 * Math.cos(p2) +
      a3 * 23.0 * Math.cos(p3)) *
    0.028;

  // Perspective-scaled Chao Phraya river stream (flows left -> right with gentle eddies)
  const depthFactor = 0.36 + yNorm * 0.94;
  const eddyX = Math.sin(yNorm * 6.5 + tSec * 0.28) * 0.0032;
  const meanderY =
    Math.sin(xNorm * 5.2 - tSec * 0.36) * 0.0038 +
    Math.cos(xNorm * 9.0 + yNorm * 4.0 + tSec * 0.22) * 0.0018;

  let flowVx = (0.0155 + eddyX) * depthFactor;
  let flowVy = meanderY * depthFactor;

  // Interactive radial ripple impulses ("วักน้ำส่งกระทง")
  for (const r of ripples) {
    const age = tSec - r.createdAtSec;
    if (age <= 0 || age > 4.2) continue;

    const dx = xNorm - r.xNorm;
    // Aspect compensation (~3:1 perspective foreshortening vertically on the river plane)
    const dy = (yNorm - r.yNorm) * 2.6;
    const dist = Math.hypot(dx, dy);
    if (dist < 0.0005 || dist > r.maxRadiusNorm) continue;

    const front = age * r.speed;
    const bandWidth = 0.045 + age * 0.02;
    const delta = dist - front;
    const envelope =
      Math.exp(-(delta * delta) / (2 * bandWidth * bandWidth)) *
      Math.max(0, 1 - age / 4.0) *
      r.strength;

    if (envelope < 0.005) continue;

    const phase = delta * 52;
    const nx = dx / dist;
    const ny = dy / dist;

    height += Math.cos(phase) * 7.5 * envelope;
    const radialSlope = -Math.sin(phase) * 1.45 * envelope;
    slopeX += nx * radialSlope;
    slopeY += ny * radialSlope;

    // Outward hydrodynamic push from ripple wavefront
    const pushMag = 0.036 * envelope;
    flowVx += nx * pushMag;
    flowVy += (ny * pushMag) / 2.6;
  }

  return { height, slopeX, slopeY, flowVx, flowVy };
}

const LANE_BASE_Y = [0.14, 0.31, 0.50, 0.68];

export function createPhysicsBodyForKrathong(
  item: KrathongItem,
  index: number,
  tSec: number,
  isNewlyDropped: boolean
): KrathongPhysicsBody {
  const h = hashId(item.id);
  const lane = Math.min(3, Math.max(0, item.lane));

  if (isNewlyDropped) {
    // Launch directly in front of the foreground pier with gentle dip and outward velocity
    return {
      id: item.id,
      candle: item.candle,
      xNorm: 0.36 + ((h % 14) - 7) * 0.01,
      yNorm: 0.72,
      vx: 0.022,
      vy: -0.024, // Drift gently out from shore toward mid-river
      heaveZ: -8, // Initial dip on water contact
      vz: 42, // Buoyancy rebound upward
      roll: -5,
      vRoll: 18,
      pitch: 4,
      yawDeg: 0,
      flameLean: -9,
      waveSlopeX: 0,
      lane,
      dropSplashUntilSec: tSec + 2.8,
    };
  }

  // Spread existing community krathongs naturally across the Chao Phraya
  const xNorm = ((h % 940) / 1000 + index * 0.073) % 1.04 - 0.02;
  const yJitter = (((h >> 6) % 100) / 100 - 0.5) * 0.11;
  const yNorm = Math.min(0.75, Math.max(0.08, LANE_BASE_Y[lane] + yJitter));

  return {
    id: item.id,
    candle: item.candle,
    xNorm,
    yNorm,
    vx: 0.014 * (0.4 + yNorm * 0.85),
    vy: 0,
    heaveZ: 0,
    vz: 0,
    roll: 0,
    vRoll: 0,
    pitch: 0,
    yawDeg: (((h >> 11) % 10) - 5) * 0.8,
    flameLean: 0,
    waveSlopeX: 0,
    lane,
    dropSplashUntilSec: 0,
  };
}

export function stepRiverPhysics(
  bodies: KrathongPhysicsBody[],
  ripples: WaterRippleImpulse[],
  dtSec: number,
  tSec: number,
  hoveredId: string | null
): void {
  const dt = Math.min(0.05, Math.max(0.001, dtSec));

  // Prune expired ripples in-place
  for (let i = ripples.length - 1; i >= 0; i--) {
    if (tSec - ripples[i].createdAtSec > 4.2) {
      ripples.splice(i, 1);
    }
  }

  // 1. Sample river current & forces for each krathong
  for (let i = 0; i < bodies.length; i++) {
    const b = bodies[i];
    const wave = sampleWaterWave(b.xNorm, b.yNorm, tSec, ripples);
    b.waveSlopeX = wave.slopeX;

    // Gentle station-keeping drag when hovered so user can read/click easily without freezing abruptly
    const isHovered = b.id === hoveredId;
    const targetVx = isHovered ? wave.flowVx * 0.12 : wave.flowVx;
    const targetVy = isHovered ? wave.flowVy * 0.12 : wave.flowVy;

    const dragRate = isHovered ? 4.8 : 2.1;
    b.vx += (targetVx - b.vx) * Math.min(1, dragRate * dt);
    b.vy += (targetVy - b.vy) * Math.min(1, dragRate * dt);

    // Soft bank confinement (keeps krathongs inside Chao Phraya water band 0.07..0.77)
    if (b.yNorm < 0.09) {
      b.vy += (0.09 - b.yNorm) * 0.22 * dt;
    } else if (b.yNorm > 0.74) {
      b.vy -= (b.yNorm - 0.74) * 0.24 * dt;
    }

    // Spring-damper vertical buoyancy coupled to wave height
    const buoyancyK = 28.0;
    const buoyancyDamp = 6.2;
    const az = (wave.height - b.heaveZ) * buoyancyK - b.vz * buoyancyDamp;
    b.vz += az * dt;
    b.heaveZ += b.vz * dt;

    // Rotational roll & pitch torque from wave slope
    const targetRoll = Math.max(-9.5, Math.min(9.5, wave.slopeX * 13.5));
    const aRoll = (targetRoll - b.roll) * 24.0 - b.vRoll * 5.8;
    b.vRoll += aRoll * dt;
    b.roll += b.vRoll * dt;

    const targetPitch = Math.max(-5, Math.min(5, wave.slopeY * 9.0));
    b.pitch += (targetPitch - b.pitch) * Math.min(1, 5.0 * dt);

    // Subtle slow eddy yaw
    const h = hashId(b.id);
    b.yawDeg = Math.sin(tSec * 0.28 + (h % 31)) * 4.5;

    // Candle flame leans smoothly opposite relative horizontal acceleration / breeze
    const breeze = Math.sin(tSec * 2.4 + (h % 17)) * 2.4 + Math.cos(tSec * 4.1 + h) * 1.1;
    const targetLean = Math.max(
      -13,
      Math.min(13, -b.vx * 220 + (wave.flowVx - b.vx) * 260 + breeze - b.roll * 0.45)
    );
    b.flameLean += (targetLean - b.flameLean) * Math.min(1, 8.5 * dt);
  }

  // 2. Soft hydrodynamic pairwise repulsion so krathongs glide around each other cleanly
  for (let i = 0; i < bodies.length; i++) {
    const a = bodies[i];
    const scaleA = getPerspectiveScale(a.yNorm);
    for (let j = i + 1; j < bodies.length; j++) {
      const b = bodies[j];
      const scaleB = getPerspectiveScale(b.yNorm);
      const minDist = 0.068 * ((scaleA + scaleB) * 0.5);

      const dx = b.xNorm - a.xNorm;
      const dy = (b.yNorm - a.yNorm) * 2.2;
      const dist = Math.hypot(dx, dy);

      if (dist > 0.0001 && dist < minDist) {
        const overlap = (minDist - dist) / minDist;
        const push = overlap * 0.038 * dt;
        const nx = dx / dist;
        const ny = dy / dist;

        a.vx -= nx * push;
        a.vy -= (ny * push) / 2.2;
        b.vx += nx * push;
        b.vy += (ny * push) / 2.2;
      }
    }
  }

  // 3. Integrate positions & seamless horizontal river loop
  for (const b of bodies) {
    b.xNorm += b.vx * dt;
    b.yNorm = Math.min(0.78, Math.max(0.06, b.yNorm + b.vy * dt));

    if (b.xNorm > 1.09) {
      b.xNorm = -0.09;
    } else if (b.xNorm < -0.09) {
      b.xNorm = 1.09;
    }
  }
}
