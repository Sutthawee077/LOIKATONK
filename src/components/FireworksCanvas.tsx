"use client";

import React, { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { festivalAudio } from "@/lib/sound";

export interface FireworksHandle {
  launchBurst: (count?: number) => void;
}

type ShellStyle = "willow" | "chrysanthemum" | "crown";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  alpha: number;
  decay: number;
  drag: number;
  gravity: number;
  rgb: string;
  coreRgb: string;
  width: number;
  maxTrail: number;
  trail: { x: number; y: number }[];
  strobe: boolean;
  canSubSpark: boolean;
}

interface Rocket {
  x: number;
  y: number;
  targetY: number;
  vx: number;
  vy: number;
  style: ShellStyle;
  rgb: string;
  coreRgb: string;
  secondaryRgb: string;
  trail: { x: number; y: number }[];
}

interface SkyFlash {
  x: number;
  y: number;
  radius: number;
  alpha: number;
  rgb: string;
}

interface FireworkTheme {
  rgb: string;
  coreRgb: string;
  secondaryRgb: string;
}

const THEMES: FireworkTheme[] = [
  // Champagne Willow Gold
  { rgb: "244, 198, 108", coreRgb: "255, 244, 212", secondaryRgb: "222, 146, 58" },
  // Crimson & Warm Gold Chrysanthemum
  { rgb: "226, 98, 104", coreRgb: "255, 228, 214", secondaryRgb: "242, 194, 102" },
  // Moonlit Pearl & Sapphire
  { rgb: "148, 198, 236", coreRgb: "242, 248, 255", secondaryRgb: "244, 216, 152" },
  // Antique Amber & Ivory
  { rgb: "238, 162, 74", coreRgb: "255, 240, 206", secondaryRgb: "250, 236, 202" },
  // Royal Orchid & Silver
  { rgb: "194, 144, 224", coreRgb: "248, 236, 255", secondaryRgb: "244, 206, 128" },
];

export const FireworksCanvas = forwardRef<FireworksHandle>(function FireworksCanvas(
  _props,
  ref
) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rocketsRef = useRef<Rocket[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const flashesRef = useRef<SkyFlash[]>([]);
  const rafRef = useRef<number | null>(null);

  const explode = (r: Rocket) => {
    festivalAudio.playFireworkExplosion(r.style === "willow" ? 1.05 : 0.92);

    // Add brief bright sky illumination flash & Chao Phraya reflection
    flashesRef.current.push({
      x: r.x,
      y: r.y,
      radius: r.style === "willow" ? 155 : 130,
      alpha: 0.42,
      rgb: r.rgb,
    });

    if (r.style === "willow") {
      // Plume of drooping golden brocade streamers
      const count = 68;
      for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.14;
        const speed = 2.6 + Math.random() * 3.8;
        particlesRef.current.push({
          x: r.x,
          y: r.y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 0.4,
          alpha: 1,
          decay: 0.0085 + Math.random() * 0.006,
          drag: 0.958,
          gravity: 0.046,
          rgb: r.rgb,
          coreRgb: r.coreRgb,
          width: 1.7 + Math.random() * 0.9,
          maxTrail: 14,
          trail: [],
          strobe: Math.random() > 0.45,
          canSubSpark: false,
        });
      }
    } else if (r.style === "chrysanthemum") {
      // Double concentric chrysanthemum burst (outer petals + contrasting inner core)
      const outerCount = 62;
      for (let i = 0; i < outerCount; i++) {
        const angle = (Math.PI * 2 * i) / outerCount + (Math.random() - 0.5) * 0.09;
        const speed = 4.2 + Math.random() * 1.4;
        particlesRef.current.push({
          x: r.x,
          y: r.y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          alpha: 1,
          decay: 0.013 + Math.random() * 0.007,
          drag: 0.974,
          gravity: 0.048,
          rgb: r.rgb,
          coreRgb: r.coreRgb,
          width: 1.8,
          maxTrail: 9,
          trail: [],
          strobe: false,
          canSubSpark: false,
        });
      }
      const innerCount = 32;
      for (let i = 0; i < innerCount; i++) {
        const angle = (Math.PI * 2 * i) / innerCount + (Math.random() - 0.5) * 0.12;
        const speed = 2.2 + Math.random() * 1.1;
        particlesRef.current.push({
          x: r.x,
          y: r.y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          alpha: 1,
          decay: 0.016 + Math.random() * 0.007,
          drag: 0.968,
          gravity: 0.045,
          rgb: r.secondaryRgb,
          coreRgb: "255, 248, 228",
          width: 1.5,
          maxTrail: 7,
          trail: [],
          strobe: Math.random() > 0.5,
          canSubSpark: false,
        });
      }
    } else {
      // Crown burst with thick trails and terminal micro-sparks
      const count = 48;
      for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.15;
        const speed = 3.2 + Math.random() * 3.0;
        particlesRef.current.push({
          x: r.x,
          y: r.y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          alpha: 1,
          decay: 0.012 + Math.random() * 0.007,
          drag: 0.968,
          gravity: 0.052,
          rgb: i % 3 === 0 ? r.secondaryRgb : r.rgb,
          coreRgb: r.coreRgb,
          width: 2.1,
          maxTrail: 8,
          trail: [],
          strobe: false,
          canSubSpark: i % 2 === 0,
        });
      }
    }
  };

  const startLoop = () => {
    if (rafRef.current !== null) return;

    const tick = (nowMs: number) => {
      const canvas = canvasRef.current;
      if (!canvas) {
        rafRef.current = null;
        return;
      }
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        rafRef.current = null;
        return;
      }

      const w = canvas.width;
      const h = canvas.height;
      const t = nowMs * 0.001;

      ctx.clearRect(0, 0, w, h);

      // Additive blending creates authentic incandescent white-gold cores without shadowBlur overhead
      ctx.save();
      ctx.globalCompositeOperation = "lighter";

      // 1. Sky Flashes & Chao Phraya River Reflections
      const nextFlashes: SkyFlash[] = [];
      for (const f of flashesRef.current) {
        f.alpha -= 0.022;
        if (f.alpha <= 0.01) continue;

        const skyGrad = ctx.createRadialGradient(f.x, f.y, 2, f.x, f.y, f.radius);
        skyGrad.addColorStop(0, `rgba(255, 246, 224, ${(f.alpha * 0.65).toFixed(3)})`);
        skyGrad.addColorStop(0.35, `rgba(${f.rgb}, ${(f.alpha * 0.35).toFixed(3)})`);
        skyGrad.addColorStop(1, `rgba(${f.rgb}, 0)`);
        ctx.fillStyle = skyGrad;
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.radius, 0, Math.PI * 2);
        ctx.fill();

        // Shimmering firework light reflection cast on Chao Phraya River (below 62% horizon)
        const riverTop = h * 0.63;
        const reflSlices = 10;
        for (let s = 0; s < reflSlices; s++) {
          const p = s / reflSlices;
          const ry = riverTop + p * (h * 0.28);
          const rw = (22 + p * 36) * (0.7 + 0.3 * Math.sin(t * 7 + s));
          const rxOffset = Math.sin(s * 1.6 - t * 4.5) * (4 + p * 8);
          const ra = f.alpha * 0.28 * (1 - p);
          ctx.fillStyle = `rgba(${f.rgb}, ${ra.toFixed(3)})`;
          ctx.fillRect(f.x - rw * 0.5 + rxOffset, ry, rw, 2.2 + p * 1.4);
        }

        nextFlashes.push(f);
      }
      flashesRef.current = nextFlashes;

      // 2. Ascending Mortar Shells
      const nextRockets: Rocket[] = [];
      for (const r of rocketsRef.current) {
        r.trail.push({ x: r.x, y: r.y });
        if (r.trail.length > 12) r.trail.shift();

        r.x += r.vx;
        r.y += r.vy;
        r.vy += 0.075;

        if (r.trail.length > 1) {
          for (let i = 1; i < r.trail.length; i++) {
            const p0 = r.trail[i - 1];
            const p1 = r.trail[i];
            const prog = i / r.trail.length;
            ctx.strokeStyle = `rgba(255, 224, 152, ${(prog * 0.65).toFixed(3)})`;
            ctx.lineWidth = 1.1 + prog * 1.4;
            ctx.beginPath();
            ctx.moveTo(p0.x, p0.y);
            ctx.lineTo(p1.x, p1.y);
            ctx.stroke();
          }
        }

        ctx.fillStyle = "rgba(255, 248, 222, 0.95)";
        ctx.beginPath();
        ctx.arc(r.x, r.y, 2.2, 0, Math.PI * 2);
        ctx.fill();

        if (r.y <= r.targetY || r.vy >= -0.75) {
          explode(r);
        } else {
          nextRockets.push(r);
        }
      }
      rocketsRef.current = nextRockets;

      // 3. Firework Streamer Trails & Sparks
      const nextParticles: Particle[] = [];
      for (const p of particlesRef.current) {
        p.trail.push({ x: p.x, y: p.y });
        if (p.trail.length > p.maxTrail) p.trail.shift();

        p.vx *= p.drag;
        p.vy = p.vy * p.drag + p.gravity;
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= p.decay;

        if (p.canSubSpark && p.alpha < 0.38 && p.alpha > 0.34) {
          p.canSubSpark = false;
          for (let k = 0; k < 3; k++) {
            const sa = Math.random() * Math.PI * 2;
            const ss = 0.8 + Math.random() * 1.4;
            nextParticles.push({
              x: p.x,
              y: p.y,
              vx: p.vx * 0.35 + Math.cos(sa) * ss,
              vy: p.vy * 0.35 + Math.sin(sa) * ss,
              alpha: 0.85,
              decay: 0.032,
              drag: 0.94,
              gravity: 0.04,
              rgb: p.coreRgb,
              coreRgb: "255, 255, 255",
              width: 1.2,
              maxTrail: 4,
              trail: [],
              strobe: true,
              canSubSpark: false,
            });
          }
        }

        if (p.alpha <= 0.02) continue;

        const flicker = p.strobe && p.alpha < 0.55 && Math.random() > 0.58 ? 0.25 : 1;
        const drawAlpha = p.alpha * flicker;

        // Tapered luminous tail
        if (p.trail.length > 1) {
          for (let i = 1; i < p.trail.length; i++) {
            const pt0 = p.trail[i - 1];
            const pt1 = p.trail[i];
            const seg = i / p.trail.length;
            ctx.strokeStyle = `rgba(${p.rgb}, ${(drawAlpha * seg * 0.72).toFixed(3)})`;
            ctx.lineWidth = p.width * (0.35 + seg * 0.65);
            ctx.beginPath();
            ctx.moveTo(pt0.x, pt0.y);
            ctx.lineTo(pt1.x, pt1.y);
            ctx.stroke();
          }
        }

        // Incandescent spark head
        ctx.fillStyle = `rgba(${p.coreRgb}, ${Math.min(1, drawAlpha * 1.1).toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.width * 0.85, 0, Math.PI * 2);
        ctx.fill();

        nextParticles.push(p);
      }
      particlesRef.current = nextParticles;

      ctx.restore();

      if (
        rocketsRef.current.length > 0 ||
        particlesRef.current.length > 0 ||
        flashesRef.current.length > 0
      ) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        rafRef.current = null;
      }
    };

    rafRef.current = requestAnimationFrame(tick);
  };

  useImperativeHandle(ref, () => ({
    launchBurst(count = 3) {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const w = canvas.width;
      const h = canvas.height;
      const styles: ShellStyle[] = ["willow", "chrysanthemum", "crown"];

      for (let i = 0; i < count; i++) {
        setTimeout(() => {
          const startX = w * (0.16 + Math.random() * 0.68);
          const targetY = h * (0.10 + Math.random() * 0.26);
          const theme = THEMES[Math.floor(Math.random() * THEMES.length)];
          const style = styles[(i + Math.floor(Math.random() * styles.length)) % styles.length];

          rocketsRef.current.push({
            x: startX,
            y: h * 0.68,
            targetY,
            vx: (Math.random() - 0.5) * 1.5,
            vy: -(8.6 + Math.random() * 3.0),
            style,
            rgb: theme.rgb,
            coreRgb: theme.coreRgb,
            secondaryRgb: theme.secondaryRgb,
            trail: [],
          });
          festivalAudio.playFireworkLaunch();
          startLoop();
        }, i * 320);
      }
    },
  }));

  useEffect(() => {
    const resize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resize();
    window.addEventListener("resize", resize);
    return () => {
      window.removeEventListener("resize", resize);
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-20"
    />
  );
});
