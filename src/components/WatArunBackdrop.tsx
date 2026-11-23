"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  getPerspectiveScale,
  type KrathongPhysicsBody,
  type WaterRippleImpulse,
} from "@/lib/riverPhysics";
import type { KrathongCandleId } from "@/types/krathong";

interface DistantBoat {
  xFrac: number;
  yFrac: number;
  speed: number;
  length: number;
}

const INITIAL_BOATS: DistantBoat[] = [
  { xFrac: 0.14, yFrac: 0.03, speed: 0.00014, length: 42 },
  { xFrac: 0.76, yFrac: 0.06, speed: -0.00011, length: 32 },
];

const CANDLE_REFLECT_RGB: Record<KrathongCandleId, string> = {
  "gold-wealth": "238, 186, 94",
  "pink-love": "224, 126, 146",
  "blue-peace": "148, 198, 232",
  "purple-career": "188, 144, 219",
  "white-purity": "240, 224, 186",
};

interface WatArunBackdropProps {
  bodiesRef?: React.RefObject<Map<string, KrathongPhysicsBody>>;
  ripplesRef?: React.RefObject<WaterRippleImpulse[]>;
}

export function WatArunBackdrop({
  bodiesRef,
  ripplesRef,
}: WatArunBackdropProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [hasPhoto, setHasPhoto] = useState(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let rafId = 0;
    const boats = INITIAL_BOATS.map((b) => ({ ...b }));
    let cachedWaterGrad: CanvasGradient | null = null;

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      // Use native 1x resolution for water canvas (4x fewer pixels than DPR=2, soft water remains smooth)
      canvas.width = Math.max(1, Math.floor(parent.clientWidth));
      canvas.height = Math.max(1, Math.floor(parent.clientHeight));

      const ctx = canvas.getContext("2d");
      if (ctx) {
        const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
        if (hasPhoto) {
          grad.addColorStop(0, "rgba(7, 9, 14, 0.08)");
          grad.addColorStop(0.55, "rgba(6, 8, 12, 0.34)");
          grad.addColorStop(1, "rgba(4, 5, 8, 0.72)");
        } else {
          grad.addColorStop(0, "rgba(11, 14, 21, 0.84)");
          grad.addColorStop(0.5, "rgba(7, 10, 16, 0.92)");
          grad.addColorStop(1, "rgba(4, 6, 10, 0.98)");
        }
        cachedWaterGrad = grad;
      }
    };

    resize();
    window.addEventListener("resize", resize);

    const drawFrame = (timeMs: number) => {
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const w = canvas.width;
      const h = canvas.height;
      const t = timeMs * 0.001;

      ctx.clearRect(0, 0, w, h);

      // 1. Cached water depth glaze
      if (cachedWaterGrad) {
        ctx.fillStyle = cachedWaterGrad;
        ctx.fillRect(0, 0, w, h);
      }

      // 2. Dynamic horizontal wave bands across Chao Phraya
      const bandCount = 36;
      for (let i = 0; i < bandCount; i++) {
        const yNorm = i / bandCount;
        const y = Math.pow(yNorm, 1.28) * h;
        const thickness = 1 + yNorm * 1.5;
        const waveShift = Math.sin(yNorm * 16 + t * 1.15) * 12;
        const alpha = 0.018 + Math.sin(yNorm * 22 - t * 1.45) * 0.01;

        ctx.fillStyle = `rgba(180, 198, 224, ${Math.max(0.005, alpha).toFixed(3)})`;
        ctx.fillRect(waveShift, y, w - waveShift, thickness);
      }

      // 3. Zero-allocation two-pass architectural water shimmer beneath Wat Arun
      const templeCenter = hasPhoto ? 0.5 : 0.34;
      const spires = [
        { xFrac: templeCenter, widthFrac: 0.06, depthFrac: 0.82, strength: hasPhoto ? 0.16 : 0.32 },
        { xFrac: templeCenter - 0.06, widthFrac: 0.028, depthFrac: 0.55, strength: hasPhoto ? 0.1 : 0.2 },
        { xFrac: templeCenter + 0.06, widthFrac: 0.028, depthFrac: 0.55, strength: hasPhoto ? 0.1 : 0.2 },
      ];

      for (const spire of spires) {
        const cx = w * spire.xFrac;
        const maxLen = h * spire.depthFrac;
        const slices = 26;
        for (let s = 0; s < slices; s++) {
          const p = s / slices;
          const sy = Math.pow(p, 1.12) * maxLen;
          const wobble =
            Math.sin(p * 19 - t * 1.9 + spire.xFrac * 18) * (3 + p * 11) +
            Math.cos(p * 10 + t * 1.2) * 2.5;
          const sliceW =
            w * spire.widthFrac * (1 - p * 0.52) * (0.65 + 0.35 * Math.sin(p * 22 + t * 2.4));
          const alpha = spire.strength * (1 - p) * (0.55 + 0.45 * Math.sin(p * 14 - t * 2.8));

          if (alpha <= 0.008 || sliceW <= 1) continue;
          const sliceH = 1.4 + p * 2.2;
          ctx.fillStyle = `rgba(225, 174, 92, ${(alpha * 0.45).toFixed(3)})`;
          ctx.fillRect(cx - sliceW + wobble, sy, sliceW * 2, sliceH);
          ctx.fillStyle = `rgba(244, 204, 128, ${(alpha * 0.7).toFixed(3)})`;
          ctx.fillRect(cx - sliceW * 0.45 + wobble, sy, sliceW * 0.9, sliceH);
        }
      }

      // 4. Zero-allocation moonlight shimmer beneath Full Moon
      const moonX = w * (hasPhoto ? 0.8 : 0.86);
      const moonMaxLen = h * 0.76;
      for (let s = 0; s < 22; s++) {
        const p = s / 22;
        const sy = Math.pow(p, 1.18) * moonMaxLen;
        const wobble = Math.sin(p * 22 - t * 2.2) * (3 + p * 12);
        const sliceW = w * 0.04 * (0.5 + 0.5 * Math.cos(p * 16 + t * 2.1));
        const alpha = (hasPhoto ? 0.13 : 0.24) * (1 - p) * (0.5 + 0.5 * Math.sin(p * 17 - t * 2.6));

        if (alpha <= 0.008) continue;
        const sliceH = 1.2 + p * 1.9;
        ctx.fillStyle = `rgba(238, 228, 202, ${(alpha * 0.42).toFixed(3)})`;
        ctx.fillRect(moonX - sliceW + wobble, sy, sliceW * 2, sliceH);
        ctx.fillStyle = `rgba(250, 242, 220, ${(alpha * 0.72).toFixed(3)})`;
        ctx.fillRect(moonX - sliceW * 0.42 + wobble, sy, sliceW * 0.84, sliceH);
      }

      // 5. Distant river boats slowly crossing near the far bank
      for (const boat of boats) {
        boat.xFrac += boat.speed;
        if (boat.xFrac > 1.1) boat.xFrac = -0.1;
        if (boat.xFrac < -0.1) boat.xFrac = 1.1;

        const bx = boat.xFrac * w;
        const by = boat.yFrac * h;
        const blen = boat.length;

        ctx.fillStyle = "rgba(6, 7, 10, 0.82)";
        ctx.fillRect(bx - blen * 0.5, by, blen, 2.5);

        const lights = 5;
        for (let l = 0; l < lights; l++) {
          const lx = bx - blen * 0.36 + (l / (lights - 1)) * (blen * 0.72);
          ctx.fillStyle = "rgba(245, 203, 122, 0.78)";
          ctx.fillRect(lx - 1.2, by - 2.2, 2.4, 2.4);

          ctx.fillStyle = "rgba(245, 203, 122, 0.2)";
          ctx.fillRect(lx - 1, by + 3, 2, 4.5);
        }
      }

      // 6. Interactive & Splash Water Ripples
      const ripples = ripplesRef?.current ?? [];
      for (const r of ripples) {
        const age = t - r.createdAtSec;
        if (age <= 0 || age > 4.0) continue;

        const rx = age * r.speed * w;
        const ry = rx * 0.34;
        const fade = Math.max(0, 1 - age / 4.0);
        const cx = r.xNorm * w;
        const cy = r.yNorm * h;

        ctx.beginPath();
        ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(229, 201, 139, ${(0.34 * fade * r.strength).toFixed(3)})`;
        ctx.lineWidth = 1.5 + fade * 1.2;
        ctx.stroke();

        if (rx > 18) {
          ctx.beginPath();
          ctx.ellipse(cx, cy, rx * 0.74, ry * 0.74, 0, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(176, 198, 224, ${(0.22 * fade * r.strength).toFixed(3)})`;
          ctx.lineWidth = 1.0;
          ctx.stroke();
        }
      }

      // 7. Coupled Krathong Wakes & Zero-Allocation Candlelight Reflections
      const bodies = bodiesRef?.current;
      if (bodies && bodies.size > 0) {
        bodies.forEach((b) => {
          const cx = b.xNorm * w;
          const cy = b.yNorm * h;
          const pScale = getPerspectiveScale(b.yNorm);
          const baseRadius = 46 * pScale;

          const speedMag = Math.hypot(b.vx, b.vy * 2.2);
          const dirX = speedMag > 0.0005 ? b.vx / speedMag : 1;
          const dirY = speedMag > 0.0005 ? (b.vy * 2.2) / speedMag : 0;

          const wakeStretch = 1 + Math.min(0.6, speedMag * 18);
          const pulse = 1 + Math.sin(t * 2.8 + b.xNorm * 12) * 0.04 + Math.abs(b.heaveZ) * 0.014;

          for (let k = 1; k <= 2; k++) {
            const trailDist = k * 13 * pScale;
            const wx = cx - dirX * trailDist;
            const wy = cy - dirY * trailDist * 0.42 + 2 * pScale;
            const wrx = baseRadius * (0.94 + k * 0.22) * wakeStretch * pulse;
            const wry = wrx * 0.28;

            ctx.beginPath();
            ctx.ellipse(wx, wy, wrx, wry, 0, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(175, 196, 220, ${(0.16 / k).toFixed(3)})`;
            ctx.lineWidth = 1.0 - k * 0.2;
            ctx.stroke();
          }

          ctx.beginPath();
          ctx.ellipse(cx, cy + 2 * pScale, baseRadius * 0.94, baseRadius * 0.25, 0, 0, Math.PI * 2);
          ctx.strokeStyle = "rgba(218, 228, 240, 0.2)";
          ctx.lineWidth = 1.0;
          ctx.stroke();

          // Two-layer horizontal candle shimmer without createLinearGradient
          const rgb = CANDLE_REFLECT_RGB[b.candle];
          const reflectSlices = 6;
          for (let s = 0; s < reflectSlices; s++) {
            const p = s / reflectSlices;
            const sy = cy + (8 + s * 7.5) * pScale;
            const wobble =
              (Math.sin(s * 1.4 - t * 3.6 + b.xNorm * 14) * (2.5 + s * 1.1) +
                b.waveSlopeX * 14) *
              pScale;
            const sw = baseRadius * (0.56 - p * 0.4) * (0.75 + 0.25 * Math.sin(t * 4.2 + s));
            const alpha = (0.28 * (1 - p) + 0.03) * (0.78 + 0.22 * Math.sin(t * 5.0 + s * 2));

            if (sw <= 1) continue;
            const sh = (1.5 + p * 1.1) * pScale;
            ctx.fillStyle = `rgba(${rgb}, ${(alpha * 0.45).toFixed(3)})`;
            ctx.fillRect(cx - sw + wobble, sy, sw * 2, sh);
            ctx.fillStyle = `rgba(${rgb}, ${(alpha * 0.8).toFixed(3)})`;
            ctx.fillRect(cx - sw * 0.45 + wobble, sy, sw * 0.9, sh);
          }
        });
      }

      rafId = requestAnimationFrame(drawFrame);
    };

    rafId = requestAnimationFrame(drawFrame);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", resize);
    };
  }, [hasPhoto, bodiesRef, ripplesRef]);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden bg-[#04060b]">
      {hasPhoto ? (
        <div className="absolute inset-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="./wat-arun-night.jpg"
            alt="พระปรางค์วัดอรุณราชวรารามริมแม่น้ำเจ้าพระยายามค่ำคืน"
            onLoad={() => setHasPhoto(true)}
            onError={() => setHasPhoto(false)}
            className="h-full w-full object-cover object-center"
          />
          <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-[#04060b]/75 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 h-36 bg-gradient-to-t from-[#040508]/85 to-transparent" />
        </div>
      ) : (
        <>
          <div className="absolute inset-x-0 top-0 h-[62%] bg-gradient-to-b from-[#04060c] via-[#0b101d] to-[#1a1816]" />

          <div
            className="absolute left-[14%] top-[28%] h-64 w-[44%] rounded-full blur-3xl"
            style={{
              background:
                "radial-gradient(ellipse at center, rgba(201, 152, 74, 0.22) 0%, rgba(120, 78, 28, 0.08) 55%, transparent 80%)",
            }}
          />

          <div className="absolute right-[9%] top-[10%] sm:right-[13%]">
            <svg
              viewBox="0 0 120 120"
              className="h-20 w-20 drop-shadow-[0_0_28px_rgba(246,231,193,0.45)] sm:h-24 sm:w-24"
              aria-hidden="true"
            >
              <defs>
                <radialGradient id="lunar-surface-fb" cx="38%" cy="35%" r="65%">
                  <stop offset="0%" stopColor="#fffdf5" />
                  <stop offset="58%" stopColor="#f3e5c2" />
                  <stop offset="100%" stopColor="#b59d6d" />
                </radialGradient>
                <clipPath id="lunar-clip-fb">
                  <circle cx="60" cy="60" r="46" />
                </clipPath>
              </defs>
              <circle cx="60" cy="60" r="46" fill="url(#lunar-surface-fb)" />
              <g clipPath="url(#lunar-clip-fb)" opacity="0.16" fill="#6b5b40">
                <ellipse cx="44" cy="42" rx="14" ry="10" transform="rotate(-18 44 42)" />
                <ellipse cx="70" cy="46" rx="16" ry="13" transform="rotate(14 70 46)" />
                <circle cx="56" cy="68" r="11" />
              </g>
            </svg>
          </div>

          <div className="absolute inset-x-0 top-[24%] h-[38%]">
            <svg
              viewBox="0 0 1440 360"
              preserveAspectRatio="xMidYMax slice"
              className="h-full w-full"
              aria-hidden="true"
            >
              <defs>
                <linearGradient id="prang-lit-fb" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#f2d59a" />
                  <stop offset="45%" stopColor="#c7954b" />
                  <stop offset="100%" stopColor="#261b10" />
                </linearGradient>
              </defs>
              <path
                d="M0 360 L0 318 Q180 298 340 318 L1440 315 L1440 360 Z"
                fill="#0b0e14"
              />
              {[365, 416, 564, 615].map((cx, idx) => (
                <path
                  key={idx}
                  d={`M${cx - 14} 320 L${cx - 8} 200 L${cx} 150 L${cx + 8} 200 L${cx + 14} 320 Z`}
                  fill="#9d7135"
                />
              ))}
              <g transform="translate(490, 0)">
                <path
                  d="M-34 318 Q-28 190 -16 125 Q-8 88 0 65 Q8 88 16 125 Q28 190 34 318 Z"
                  fill="url(#prang-lit-fb)"
                />
                <line x1="0" y1="65" x2="0" y2="34" stroke="#fae5b4" strokeWidth="2.2" />
              </g>
            </svg>
          </div>
        </>
      )}

      <div className="absolute inset-x-0 bottom-0 top-[62%]">
        <canvas ref={canvasRef} className="h-full w-full" aria-hidden="true" />
      </div>
    </div>
  );
}
