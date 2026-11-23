"use client";

import React, { useEffect, useId, useRef, useState } from "react";
import type {
  KrathongBaseId,
  KrathongCandleId,
  KrathongFlowerId,
  KrathongToppingId,
} from "@/types/krathong";

interface KrathongSvgProps {
  base: KrathongBaseId;
  flower: KrathongFlowerId;
  candle: KrathongCandleId;
  topping: KrathongToppingId;
  showWaterReflection?: boolean;
  isHighlighted?: boolean;
  flameLean?: number;
  includeFlame?: boolean;
  size?: number;
  className?: string;
}

const CX = 110;
const WATER_CY = 142;
const ELLIPSE_Y = 0.37;

interface DepthItem {
  depth: number;
  key: string;
  node: React.ReactNode;
}

const CANDLE_PALETTE: Record<
  KrathongCandleId,
  { waxTop: string; waxBottom: string; glow: string; waterReflect: string }
> = {
  "gold-wealth": {
    waxTop: "#fde8a6",
    waxBottom: "#9a6619",
    glow: "#f0b954",
    waterReflect: "#e6af4b",
  },
  "pink-love": {
    waxTop: "#fbc4cf",
    waxBottom: "#842138",
    glow: "#e88496",
    waterReflect: "#df798b",
  },
  "blue-peace": {
    waxTop: "#d4ecfa",
    waxBottom: "#1b587e",
    glow: "#8fc6e8",
    waterReflect: "#8ab9d9",
  },
  "purple-career": {
    waxTop: "#e6cff7",
    waxBottom: "#502274",
    glow: "#bc8be0",
    waterReflect: "#ad80cf",
  },
  "white-purity": {
    waxTop: "#fffdf5",
    waxBottom: "#8a867b",
    glow: "#f4dfb0",
    waterReflect: "#e5cf9f",
  },
};

/**
 * Generates a single compound SVG path containing `count` rotated ellipses
 * around (0, 0) at radial offset `cy` so an entire flower takes 1 DOM node.
 */
function makeEllipseRingPath(
  count: number,
  cy: number,
  rx: number,
  ry: number,
  offsetDeg = 0
): string {
  const parts: string[] = [];
  for (let i = 0; i < count; i++) {
    const deg = (i / count) * 360 + offsetDeg;
    const rad = (deg * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);

    // Rotate local points (0, cy - ry) and (0, cy + ry)
    const tx = -((cy - ry) * sin);
    const ty = (cy - ry) * cos;
    const bx = -((cy + ry) * sin);
    const by = (cy + ry) * cos;

    parts.push(
      `M ${tx.toFixed(2)} ${ty.toFixed(2)} A ${rx} ${ry} ${deg.toFixed(1)} 0 1 ${bx.toFixed(2)} ${by.toFixed(2)} A ${rx} ${ry} ${deg.toFixed(1)} 0 1 ${tx.toFixed(2)} ${ty.toFixed(2)} Z`
    );
  }
  return parts.join(" ");
}

// Precomputed compound floral geometry strings (huge reduction in SVG DOM nodes)
const MARIGOLD_OUTER_PATH = makeEllipseRingPath(10, -5.4, 2.6, 4.5, 0);
const MARIGOLD_INNER_PATH = makeEllipseRingPath(10, -3.2, 2.1, 3.4, 18);
const ORCHID_PETALS_PATH = makeEllipseRingPath(5, -5.6, 2.7, 4.6, 0);
const ROSE_OUTER_PATH = makeEllipseRingPath(6, -4.8, 4.2, 4.5, 0);
const ROSE_INNER_PATH = makeEllipseRingPath(3, -2.6, 3.0, 3.2, 30);
const JASMINE_PETALS_PATH = makeEllipseRingPath(6, -4.8, 1.9, 4.2, 0);
const MIX_PETALS_PATH = makeEllipseRingPath(8, -4.8, 2.4, 4.8, 0);

function project3D(r: number, theta: number, z: number): { x: number; y: number } {
  return {
    x: CX + r * Math.cos(theta),
    y: WATER_CY + r * ELLIPSE_Y * Math.sin(theta) - z,
  };
}

function buildRadialBaseItems(base: KrathongBaseId, uid: string): DepthItem[] {
  const items: DepthItem[] = [];

  if (base === "banana-leaf") {
    const tiers = [
      { count: 16, rBase: 64, rTip: 76, zBase: 4, zTip: 18, halfW: 0.23, offset: 0, tierIdx: 0 },
      { count: 14, rBase: 55, rTip: 61, zBase: 9, zTip: 25, halfW: 0.25, offset: 0.22, tierIdx: 1 },
      { count: 12, rBase: 46, rTip: 49, zBase: 14, zTip: 29, halfW: 0.27, offset: 0.11, tierIdx: 2 },
    ];

    for (const tier of tiers) {
      for (let i = 0; i < tier.count; i++) {
        const theta = (i / tier.count) * Math.PI * 2 + tier.offset;
        const sinT = Math.sin(theta);
        const isBack = sinT < 0;

        const pL = project3D(tier.rBase, theta - tier.halfW, tier.zBase);
        const pR = project3D(tier.rBase, theta + tier.halfW, tier.zBase);
        const pTip = project3D(tier.rTip, theta, tier.zTip);
        const pMid = project3D(tier.rBase + 2, theta, tier.zBase + 1);

        const fill = isBack
          ? tier.tierIdx === 2
            ? "#3d6b4a"
            : "#2a5237"
          : tier.tierIdx === 0
            ? "#102518"
            : tier.tierIdx === 1
              ? "#193826"
              : "#234a33";

        const rimColor = isBack ? "#78a67b" : "#8ab07c";

        items.push({
          depth: sinT + tier.tierIdx * 0.04,
          key: `bl-${tier.tierIdx}-${i}`,
          node: (
            <path
              d={`M ${pL.x.toFixed(1)} ${pL.y.toFixed(1)} Q ${((pL.x + pTip.x) * 0.5).toFixed(1)} ${((pL.y + pTip.y) * 0.5 - 2).toFixed(1)} ${pTip.x.toFixed(1)} ${pTip.y.toFixed(1)} Q ${((pR.x + pTip.x) * 0.5).toFixed(1)} ${((pR.y + pTip.y) * 0.5 - 2).toFixed(1)} ${pR.x.toFixed(1)} ${pR.y.toFixed(1)} Z M ${pMid.x.toFixed(1)} ${pMid.y.toFixed(1)} L ${pTip.x.toFixed(1)} ${pTip.y.toFixed(1)}`}
              fill={fill}
              stroke={rimColor}
              strokeOpacity={isBack ? 0.45 : 0.62}
              strokeWidth="0.7"
            />
          ),
        });
      }
    }
  } else if (base === "lotus-pink") {
    const tiers = [
      { count: 14, rBase: 62, rTip: 77, zBase: 3, zTip: 15, halfW: 0.25, offset: 0, tierIdx: 0 },
      { count: 12, rBase: 54, rTip: 63, zBase: 8, zTip: 23, halfW: 0.27, offset: 0.26, tierIdx: 1 },
      { count: 10, rBase: 44, rTip: 48, zBase: 13, zTip: 28, halfW: 0.30, offset: 0.12, tierIdx: 2 },
    ];

    for (const tier of tiers) {
      for (let i = 0; i < tier.count; i++) {
        const theta = (i / tier.count) * Math.PI * 2 + tier.offset;
        const sinT = Math.sin(theta);
        const isBack = sinT < 0;

        const pL = project3D(tier.rBase, theta - tier.halfW, tier.zBase);
        const pR = project3D(tier.rBase, theta + tier.halfW, tier.zBase);
        const pTip = project3D(tier.rTip, theta, tier.zTip);

        items.push({
          depth: sinT + tier.tierIdx * 0.04,
          key: `lp-${tier.tierIdx}-${i}`,
          node: (
            <path
              d={`M ${pL.x.toFixed(1)} ${pL.y.toFixed(1)} C ${pL.x.toFixed(1)} ${((pL.y + pTip.y) * 0.5).toFixed(1)} ${((pL.x + pTip.x) * 0.5).toFixed(1)} ${pTip.y.toFixed(1)} ${pTip.x.toFixed(1)} ${pTip.y.toFixed(1)} C ${((pR.x + pTip.x) * 0.5).toFixed(1)} ${pTip.y.toFixed(1)} ${pR.x.toFixed(1)} ${((pR.y + pTip.y) * 0.5).toFixed(1)} ${pR.x.toFixed(1)} ${pR.y.toFixed(1)} Z`}
              fill={isBack ? `url(#lotus-inner-${uid})` : `url(#lotus-outer-${uid})`}
              stroke="#f6cad8"
              strokeOpacity={isBack ? 0.55 : 0.7}
              strokeWidth="0.65"
            />
          ),
        });
      }
    }
  } else if (base === "ice-crystal") {
    const tiers = [
      { count: 14, rBase: 61, rTip: 74, zBase: 4, zTip: 17, halfW: 0.24, offset: 0, tierIdx: 0 },
      { count: 10, rBase: 49, rTip: 55, zBase: 11, zTip: 27, halfW: 0.28, offset: 0.3, tierIdx: 1 },
    ];
    for (const tier of tiers) {
      for (let i = 0; i < tier.count; i++) {
        const theta = (i / tier.count) * Math.PI * 2 + tier.offset;
        const sinT = Math.sin(theta);
        const isBack = sinT < 0;

        const pL = project3D(tier.rBase, theta - tier.halfW, tier.zBase);
        const pR = project3D(tier.rBase, theta + tier.halfW, tier.zBase);
        const pTip = project3D(tier.rTip, theta, tier.zTip);

        items.push({
          depth: sinT + tier.tierIdx * 0.05,
          key: `ice-${tier.tierIdx}-${i}`,
          node: (
            <polygon
              points={`${pL.x.toFixed(1)},${pL.y.toFixed(1)} ${pTip.x.toFixed(1)},${pTip.y.toFixed(1)} ${pR.x.toFixed(1)},${pR.y.toFixed(1)}`}
              fill={isBack ? `url(#ice-caustic-${uid})` : `url(#ice-outer-${uid})`}
              fillOpacity={isBack ? 0.85 : 0.72}
              stroke="#e0f2fe"
              strokeOpacity="0.65"
              strokeWidth="0.7"
            />
          ),
        });
      }
    }
  } else if (base === "coconut-shell") {
    const count = 14;
    for (let i = 0; i < count; i++) {
      const theta = (i / count) * Math.PI * 2;
      const sinT = Math.sin(theta);
      const isBack = sinT < 0;
      const pL = project3D(50, theta - 0.22, 16);
      const pR = project3D(50, theta + 0.22, 16);
      const pTip = project3D(54, theta, 26);

      items.push({
        depth: sinT - 0.08,
        key: `coco-leaf-${i}`,
        node: (
          <polygon
            points={`${pL.x.toFixed(1)},${pL.y.toFixed(1)} ${pTip.x.toFixed(1)},${pTip.y.toFixed(1)} ${pR.x.toFixed(1)},${pR.y.toFixed(1)}`}
            fill={isBack ? "#2d573b" : "#173422"}
            stroke="#5a8564"
            strokeOpacity="0.5"
            strokeWidth="0.6"
          />
        ),
      });
    }
  }

  return items;
}

function renderSingleBloom(
  x: number,
  y: number,
  scale: number,
  flower: KrathongFlowerId,
  index: number,
  lightFactor: number
) {
  const tr = `translate(${x.toFixed(1)}, ${y.toFixed(1)}) scale(${scale.toFixed(2)})`;

  switch (flower) {
    case "marigold":
      return (
        <g transform={tr}>
          <path
            d={MARIGOLD_OUTER_PATH}
            fill={lightFactor > 0.85 ? "#d88414" : "#b8680a"}
            stroke="#6b3404"
            strokeWidth="0.35"
          />
          <path
            d={MARIGOLD_INNER_PATH}
            fill={lightFactor > 0.85 ? "#f5ba42" : "#df9c22"}
          />
          <circle r="2.5" fill="#fde59c" />
        </g>
      );

    case "orchid":
      return (
        <g transform={tr}>
          <path
            d={ORCHID_PETALS_PATH}
            fill={index % 2 === 0 ? "#6a258e" : "#8034a6"}
            stroke="#deb9f2"
            strokeOpacity={0.55 * lightFactor}
            strokeWidth="0.45"
          />
          <ellipse cx="0" cy="1.8" rx="2.8" ry="3.5" fill="#411158" />
          <circle r="1.7" fill="#f5d57a" />
        </g>
      );

    case "jasmine-rose":
      if (index % 2 === 0) {
        return (
          <g transform={tr}>
            <path
              d={ROSE_OUTER_PATH}
              fill={lightFactor > 0.85 ? "#a91c3e" : "#88132f"}
              stroke="#de738d"
              strokeOpacity="0.45"
              strokeWidth="0.35"
            />
            <path d={ROSE_INNER_PATH} fill="#c72c51" />
            <circle r="2.1" fill="#ea708d" />
          </g>
        );
      }
      return (
        <g transform={tr}>
          <path
            d={JASMINE_PETALS_PATH}
            fill={lightFactor > 0.85 ? "#f7f3e6" : "#dfd8c8"}
            stroke="#b8b09e"
            strokeWidth="0.35"
          />
          <circle r="2" fill="#e6d395" />
        </g>
      );

    case "lotus-petal":
      return (
        <g transform={tr}>
          <path
            d="M -7.5 4.2 Q -4 -7.8 0 -10.6 Q 4 -7.8 7.5 4.2 Q 0 8.8 -7.5 4.2 Z"
            fill={lightFactor > 0.85 ? "#c5507d" : "#9c345d"}
            stroke="#f7cada"
            strokeOpacity="0.55"
            strokeWidth="0.55"
          />
          <path d="M -4 3.2 Q 0 -7 4 3.2 Q 0 6.5 -4 3.2 Z" fill="#ebb0c6" />
        </g>
      );

    case "colorful-mix": {
      const tones = [
        { p: "#b83b56", c: "#f4d37e" },
        { p: "#cc8824", c: "#fbe59d" },
        { p: "#7d4a9e", c: "#f4d37e" },
        { p: "#387c6d", c: "#f4d37e" },
        { p: "#c75d38", c: "#fbe59d" },
      ];
      const t = tones[index % tones.length];
      return (
        <g transform={tr}>
          <path d={MIX_PETALS_PATH} fill={t.p} />
          <circle r="2.7" fill={t.c} />
        </g>
      );
    }
  }
}

function build3DFlowerDome(flower: KrathongFlowerId): DepthItem[] {
  const items: DepthItem[] = [];

  const outerCount = 14;
  for (let i = 0; i < outerCount; i++) {
    const theta = (i / outerCount) * Math.PI * 2 + 0.14;
    const sinT = Math.sin(theta);
    const pt = project3D(45, theta, 18);
    const scale = 0.82 + (sinT + 1) * 0.11;
    const lightFactor = sinT < 0 ? 1.0 : 0.78;

    items.push({
      depth: sinT + 0.18,
      key: `fl-out-${i}`,
      node: renderSingleBloom(pt.x, pt.y, scale, flower, i, lightFactor),
    });
  }

  const innerCount = 9;
  for (let i = 0; i < innerCount; i++) {
    const theta = (i / innerCount) * Math.PI * 2 + 0.35;
    const sinT = Math.sin(theta);
    const pt = project3D(27, theta, 22);
    const scale = 0.76 + (sinT + 1) * 0.08;

    items.push({
      depth: sinT * 0.65 + 0.05,
      key: `fl-in-${i}`,
      node: renderSingleBloom(pt.x, pt.y, scale, flower, i + 3, 1.0),
    });
  }

  return items;
}

function renderTopping(topping: KrathongToppingId) {
  switch (topping) {
    case "coin":
      return (
        <g transform="translate(110, 128)">
          <ellipse cx="0" cy="1.8" rx="9" ry="5.6" fill="#5e4312" />
          <ellipse cx="0" cy="0" rx="8.8" ry="5.4" fill="#c99e46" stroke="#ecd08e" strokeWidth="1" />
          <text x="0" y="2.6" textAnchor="middle" fontSize="7.5" fontWeight="bold" fill="#4d360c">
            ฿
          </text>
        </g>
      );

    case "mini-garland":
      return (
        <g transform="translate(110, 134)">
          <path d="M -28 -5 Q 0 11 28 -5" fill="none" stroke="#cfc6b4" strokeWidth="4.4" strokeLinecap="round" />
          <path d="M -28 -5 Q 0 11 28 -5" fill="none" stroke="#f7f2e7" strokeWidth="4.4" strokeDasharray="2.5 3.4" strokeLinecap="round" />
          <circle cx="-17" cy="1" r="2.8" fill="#9c223c" />
          <circle cx="0" cy="4.8" r="3.4" fill="#b32a47" />
          <circle cx="17" cy="1" r="2.8" fill="#9c223c" />
        </g>
      );

    case "butterfly":
      return (
        <g transform="translate(142, 107) rotate(-14)">
          <ellipse cx="-5" cy="-3" rx="5.8" ry="4.2" fill="#c99c42" stroke="#f6dfa8" strokeWidth="0.7" />
          <ellipse cx="5" cy="-3" rx="5.8" ry="4.2" fill="#c99c42" stroke="#f6dfa8" strokeWidth="0.7" />
          <ellipse cx="-4" cy="3" rx="3.6" ry="2.6" fill="#8b6824" />
          <ellipse cx="4" cy="3" rx="3.6" ry="2.6" fill="#8b6824" />
          <rect x="-0.8" y="-5" width="1.6" height="9.5" rx="0.8" fill="#2c1d0b" />
        </g>
      );

    case "heart-charm":
      return (
        <g transform="translate(110, 129)">
          <path
            d="M -9 -3 C -9 -7.5 -2.5 -8.5 -0.8 -4 C 1 -8.5 7.5 -7.5 7.5 -3 C 7.5 2.5 -0.8 7 -0.8 7 C -0.8 7 -9 2.5 -9 -3 Z"
            fill="#9d2945"
            stroke="#e8b4bf"
            strokeWidth="0.9"
          />
          <path
            d="M 2.5 -5.5 C 2.5 -8.5 6.5 -9.5 8.5 -6.5 C 10.5 -9.5 14.5 -8.5 14.5 -5.5 C 14.5 -2 8.5 1.8 8.5 1.8 C 8.5 1.8 2.5 -2 2.5 -5.5 Z"
            fill="#b83b58"
            stroke="#f1cdd5"
            strokeWidth="0.8"
          />
        </g>
      );

    case "none":
      return null;
  }
}

export function KrathongSvg({
  base,
  flower,
  candle,
  topping,
  showWaterReflection = true,
  isHighlighted = false,
  flameLean,
  includeFlame = true,
  size = 180,
  className = "",
}: KrathongSvgProps) {
  const uid = useId().replace(/:/g, "");
  const theme = CANDLE_PALETTE[candle];

  const baseItems = buildRadialBaseItems(base, uid);
  const flowerItems = build3DFlowerDome(flower);

  const centerCoreItem: DepthItem = {
    depth: 0.0,
    key: "center-core-candle",
    node: (
      <g>
        <ellipse cx={CX} cy={127} rx="34" ry="11.5" fill="#243a25" />

        {/* Three Bamboo Incense Sticks + Glowing Embers */}
        <line x1="103" y1="124" x2="96" y2="57" stroke="#a68159" strokeWidth="1.7" strokeLinecap="round" />
        <line x1="110" y1="124" x2="110" y2="53" stroke="#b9936a" strokeWidth="1.7" strokeLinecap="round" />
        <line x1="117" y1="124" x2="124" y2="57" stroke="#a68159" strokeWidth="1.7" strokeLinecap="round" />
        <circle cx="96" cy="57" r="1.6" fill="#e56b38" />
        <circle cx="110" cy="53" r="1.7" fill="#ef5432" />
        <circle cx="124" cy="57" r="1.6" fill="#e56b38" />

        {includeFlame && (
          <g>
            <g
              style={{
                transform:
                  flameLean !== undefined
                    ? `rotate(${(flameLean * 0.7).toFixed(2)}deg)`
                    : "rotate(calc(var(--flame-lean, 0deg) * 0.7))",
                transformOrigin: "110px 55px",
              }}
            >
              <g className="animate-smoke" opacity="0.3">
                <path
                  d="M 96 52 Q 91 38 98 25 M 110 49 Q 115 34 108 21 Q 103 11 111 3 M 124 52 Q 129 38 122 25"
                  fill="none"
                  stroke="#e5e9f0"
                  strokeWidth="0.9"
                  strokeLinecap="round"
                />
              </g>
            </g>
          </g>
        )}

        {/* Central Wax Candle */}
        <g>
          {includeFlame && <circle cx="110" cy="60" r="44" fill={`url(#flame-halo-${uid})`} />}
          <rect
            x="104.8"
            y="74"
            width="10.4"
            height="50"
            rx="2.6"
            fill={`url(#candle-wax-${uid})`}
            stroke={theme.waxTop}
            strokeOpacity="0.45"
            strokeWidth="0.7"
          />
          <ellipse cx="110" cy="74.5" rx="5.2" ry="1.6" fill={theme.waxTop} opacity="0.85" />
          <rect x="106.4" y="77" width="1.9" height="42" rx="1" fill="#ffffff" opacity="0.28" />
          <line x1="110" y1="74" x2="110" y2="68" stroke="#1f1712" strokeWidth="1.2" />

          {includeFlame && (
            <g
              style={{
                transform:
                  flameLean !== undefined
                    ? `rotate(${flameLean.toFixed(2)}deg)`
                    : "rotate(var(--flame-lean, 0deg))",
                transformOrigin: "110px 69px",
              }}
            >
              <g className="animate-flame" style={{ transformOrigin: "110px 69px" }}>
                <path
                  d="M 110 42 C 117.5 53 116.5 67 110 69 C 103.5 67 102.5 53 110 42 Z"
                  fill="#e57c24"
                  opacity="0.92"
                />
                <path
                  d="M 110 47 C 114.8 55 114.2 66 110 68 C 105.8 66 105.2 55 110 47 Z"
                  fill="#f7d574"
                />
                <ellipse cx="110" cy="62" rx="1.8" ry="3.8" fill="#fffef5" />
                <ellipse cx="110" cy="65.5" rx="1.4" ry="1.6" fill="#9bc9eb" opacity="0.75" />
              </g>
            </g>
          )}
        </g>
      </g>
    ),
  };

  const sortedScene = [...baseItems, ...flowerItems, centerCoreItem].sort(
    (a, b) => a.depth - b.depth
  );

  return (
    <svg
      width={size}
      height={(size * 200) / 220}
      viewBox="0 0 220 200"
      className={className}
      role="img"
      aria-label="กระทง"
    >
      <defs>
        <radialGradient id={`flame-halo-${uid}`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={theme.glow} stopOpacity="0.68" />
          <stop offset="44%" stopColor="#e8a74a" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#e8a74a" stopOpacity="0" />
        </radialGradient>

        <radialGradient id={`point-light-${uid}`} cx="50%" cy="22%" r="68%">
          <stop offset="0%" stopColor="#fff2ca" stopOpacity="0.3" />
          <stop offset="56%" stopColor="#e5a94c" stopOpacity="0.06" />
          <stop offset="100%" stopColor="#04060a" stopOpacity="0.3" />
        </radialGradient>

        <radialGradient id={`contact-shadow-${uid}`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#020305" stopOpacity="0.85" />
          <stop offset="72%" stopColor="#04060a" stopOpacity="0.48" />
          <stop offset="100%" stopColor="#04060a" stopOpacity="0" />
        </radialGradient>

        <radialGradient id={`water-glow-${uid}`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={theme.waterReflect} stopOpacity="0.38" />
          <stop offset="60%" stopColor={theme.waterReflect} stopOpacity="0.1" />
          <stop offset="100%" stopColor={theme.waterReflect} stopOpacity="0" />
        </radialGradient>

        <linearGradient id={`candle-wax-${uid}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={theme.waxTop} />
          <stop offset="40%" stopColor={theme.glow} />
          <stop offset="100%" stopColor={theme.waxBottom} />
        </linearGradient>

        <linearGradient id={`lotus-inner-${uid}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#fae0e9" />
          <stop offset="48%" stopColor="#d96b94" />
          <stop offset="100%" stopColor="#7a1e43" />
        </linearGradient>

        <linearGradient id={`lotus-outer-${uid}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#eeb3c7" />
          <stop offset="52%" stopColor="#a63763" />
          <stop offset="100%" stopColor="#4c0f28" />
        </linearGradient>

        <linearGradient id={`ice-caustic-${uid}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#fff2ca" />
          <stop offset="45%" stopColor="#93c5e6" />
          <stop offset="100%" stopColor="#1e496b" />
        </linearGradient>

        <linearGradient id={`ice-outer-${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#e1f1fc" />
          <stop offset="55%" stopColor="#4f85ad" />
          <stop offset="100%" stopColor="#15324c" />
        </linearGradient>

        <radialGradient id={`bread-dome-${uid}`} cx="50%" cy="32%" r="65%">
          <stop offset="0%" stopColor="#ebba6d" />
          <stop offset="55%" stopColor="#9e5a1b" />
          <stop offset="100%" stopColor="#401e06" />
        </radialGradient>

        <linearGradient id={`coco-bowl-${uid}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#4d2c17" />
          <stop offset="65%" stopColor="#261409" />
          <stop offset="100%" stopColor="#140a04" />
        </linearGradient>
      </defs>

      {isHighlighted && (
        <ellipse
          cx={CX}
          cy={152}
          rx="92"
          ry="28"
          fill="none"
          stroke="#e5c98b"
          strokeWidth="1.7"
          strokeDasharray="5 4"
          opacity="0.88"
        />
      )}

      {showWaterReflection && (
        <g>
          <ellipse cx={CX} cy={156} rx="78" ry="18" fill={`url(#contact-shadow-${uid})`} />
          <ellipse cx={CX} cy={166} rx="84" ry="20" fill={`url(#water-glow-${uid})`} />
        </g>
      )}

      {base === "lotus-pink" && (
        <ellipse cx={CX} cy={149} rx="82" ry="26" fill="#0c2416" stroke="#1f4c31" strokeWidth="0.9" />
      )}

      {base === "banana-leaf" && (
        <g>
          <path d="M 48 128 L 48 148 A 62 21 0 0 0 172 148 L 172 128 Z" fill="#0d2015" stroke="#224530" strokeWidth="0.8" />
          <ellipse cx={CX} cy={128} rx="62" ry="21" fill="#173322" />
        </g>
      )}

      {base === "bread-turtle" && (
        <g>
          <ellipse cx="179" cy="134" rx="15" ry="9.5" fill="#8f4f18" stroke="#4d2607" strokeWidth="1.1" />
          <ellipse cx="177" cy="132" rx="10" ry="5.5" fill="#c77e35" opacity="0.65" />
          <circle cx="185" cy="130" r="1.8" fill="#1c0e04" />
          <ellipse cx="48" cy="142" rx="13" ry="6" transform="rotate(-20 48 142)" fill="#6d3a10" />
          <ellipse cx="164" cy="147" rx="13" ry="6" transform="rotate(16 164 147)" fill="#6d3a10" />
          <ellipse cx="42" cy="130" rx="9" ry="5" transform="rotate(12 42 130)" fill="#6d3a10" />
          <path
            d="M 43 136 C 43 108 177 108 177 136 A 67 23 0 0 1 43 136 Z"
            fill={`url(#bread-dome-${uid})`}
            stroke="#422006"
            strokeWidth="1.2"
          />
          {[-34, 0, 34].map((dx, idx) => (
            <ellipse
              key={idx}
              cx={CX + dx}
              cy={138}
              rx="15"
              ry="7"
              fill="#572b09"
              opacity="0.38"
              stroke="#dfaa62"
              strokeOpacity="0.35"
              strokeWidth="0.7"
            />
          ))}
        </g>
      )}

      {base === "coconut-shell" && (
        <g>
          <ellipse cx={CX} cy={127} rx="67" ry="22" fill="#2c190d" stroke="#caa058" strokeWidth="1.4" />
          <ellipse cx={CX} cy={129} rx="58" ry="18" fill="#4f2e17" />
        </g>
      )}

      {sortedScene.map((item) => (
        <React.Fragment key={item.key}>{item.node}</React.Fragment>
      ))}

      {base === "coconut-shell" && (
        <g>
          <path
            d="M 43 127 A 67 22 0 0 0 177 127 Q 173 158 110 160 Q 47 158 43 127 Z"
            fill={`url(#coco-bowl-${uid})`}
            stroke="#c99f54"
            strokeOpacity="0.65"
            strokeWidth="1.1"
          />
          {[-42, -21, 0, 21, 42].map((dx, idx) => (
            <path
              key={idx}
              d={`M ${CX + dx - 8} 142 Q ${CX + dx} 133 ${CX + dx + 8} 142 Q ${CX + dx} 151 ${CX + dx - 8} 142 Z`}
              fill="none"
              stroke="#d4ae66"
              strokeWidth="1"
              opacity="0.72"
            />
          ))}
        </g>
      )}

      {renderTopping(topping)}

      <ellipse
        cx={CX}
        cy={134}
        rx="74"
        ry="31"
        fill={`url(#point-light-${uid})`}
        pointerEvents="none"
      />

      {showWaterReflection && (
        <g pointerEvents="none">
          <path d="M 40 151 Q 110 164 180 151" fill="none" stroke="#9fb8cd" strokeOpacity="0.28" strokeWidth="1.1" />
          <path d="M 54 155 Q 110 166 166 155" fill="none" stroke="#06090f" strokeOpacity="0.55" strokeWidth="2.2" />
        </g>
      )}
    </svg>
  );
}

// Module-level GPU sprite bitmap cache for zero-cost 60 FPS floating krathongs
const krathongSpriteCache = new Map<string, string>();
const pendingRasterConversions = new Set<string>();

interface RiverKrathongSpriteProps {
  base: KrathongBaseId;
  flower: KrathongFlowerId;
  candle: KrathongCandleId;
  topping: KrathongToppingId;
  isHighlighted?: boolean;
  size?: number;
}

/**
 * High-performance river krathong renderer:
 * Renders the complex 3D Krathong SVG once into a cached PNG GPU texture,
 * and layers only a lightweight 5-node SVG flame/smoke overlay on top.
 */
export function RiverKrathongSprite({
  base,
  flower,
  candle,
  topping,
  isHighlighted = false,
  size = 150,
}: RiverKrathongSpriteProps) {
  const cacheKey = `${base}:${flower}:${candle}:${topping}:${isHighlighted ? "1" : "0"}`;
  const [spriteEntry, setSpriteEntry] = useState<{ key: string; url: string | null }>(() => ({
    key: cacheKey,
    url: krathongSpriteCache.get(cacheKey) ?? null,
  }));
  const captureRef = useRef<HTMLDivElement | null>(null);
  const uid = useId().replace(/:/g, "");
  const theme = CANDLE_PALETTE[candle];

  const height = (size * 200) / 220;
  const activeSpriteUrl =
    krathongSpriteCache.get(cacheKey) ??
    (spriteEntry.key === cacheKey ? spriteEntry.url : null);

  useEffect(() => {
    const existing = krathongSpriteCache.get(cacheKey);
    if (existing) {
      setSpriteEntry({ key: cacheKey, url: existing });
      return;
    }

    const svgEl = captureRef.current?.querySelector("svg");
    if (!svgEl) return;

    try {
      const clone = svgEl.cloneNode(true) as SVGElement;
      clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
      clone.setAttribute("width", "330");
      clone.setAttribute("height", "300");
      const serialized = new XMLSerializer().serializeToString(clone);
      const svgDataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(serialized)}`;

      krathongSpriteCache.set(cacheKey, svgDataUrl);
      setSpriteEntry({ key: cacheKey, url: svgDataUrl });

      if (!pendingRasterConversions.has(cacheKey)) {
        pendingRasterConversions.add(cacheKey);
        const img = new Image();
        img.onload = () => {
          try {
            const canvas = document.createElement("canvas");
            canvas.width = 330;
            canvas.height = 300;
            const ctx = canvas.getContext("2d");
            if (ctx) {
              ctx.drawImage(img, 0, 0, 330, 300);
              const pngUrl = canvas.toDataURL("image/png");
              krathongSpriteCache.set(cacheKey, pngUrl);
              setSpriteEntry({ key: cacheKey, url: pngUrl });
            }
          } catch {
            // Keep SVG data URL if canvas fails
          } finally {
            pendingRasterConversions.delete(cacheKey);
          }
        };
        img.onerror = () => {
          pendingRasterConversions.delete(cacheKey);
        };
        img.src = svgDataUrl;
      }
    } catch {
      // Fallback cleanly to inline SVG if serialization fails
    }
  }, [cacheKey]);

  return (
    <div
      className="relative"
      style={{ width: `${size}px`, height: `${height.toFixed(1)}px` }}
    >
      {activeSpriteUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={activeSpriteUrl}
          alt="กระทง"
          width={size}
          height={height}
          draggable={false}
          decoding="async"
          className="h-full w-full select-none"
        />
      ) : (
        <div ref={captureRef} className="h-full w-full">
          <KrathongSvg
            base={base}
            flower={flower}
            candle={candle}
            topping={topping}
            showWaterReflection={true}
            isHighlighted={isHighlighted}
            includeFlame={false}
            size={size}
          />
        </div>
      )}

      {/* Lightweight 5-node live physics-driven candle flame & incense smoke overlay */}
      <svg
        width={size}
        height={height}
        viewBox="0 0 220 200"
        className="pointer-events-none absolute inset-0"
        aria-hidden="true"
      >
        <defs>
          <radialGradient id={`live-halo-${uid}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={theme.glow} stopOpacity="0.65" />
            <stop offset="44%" stopColor="#e8a74a" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#e8a74a" stopOpacity="0" />
          </radialGradient>
        </defs>

        <circle cx="110" cy="60" r="40" fill={`url(#live-halo-${uid})`} />

        <g
          style={{
            transform: "rotate(var(--flame-lean, 0deg))",
            transformOrigin: "110px 69px",
          }}
        >
          <g className="animate-smoke" opacity="0.28">
            <path
              d="M 96 55 Q 92 40 98 26 M 110 51 Q 114 36 108 22 M 124 55 Q 128 40 122 26"
              fill="none"
              stroke="#e5e9f0"
              strokeWidth="0.9"
              strokeLinecap="round"
            />
          </g>
          <g className="animate-flame" style={{ transformOrigin: "110px 69px" }}>
            <path
              d="M 110 42 C 117.5 53 116.5 67 110 69 C 103.5 67 102.5 53 110 42 Z"
              fill="#e57c24"
              opacity="0.92"
            />
            <path
              d="M 110 47 C 114.8 55 114.2 66 110 68 C 105.8 66 105.2 55 110 47 Z"
              fill="#f7d574"
            />
            <ellipse cx="110" cy="62.5" rx="1.8" ry="3.8" fill="#fffef5" />
          </g>
        </g>
      </svg>
    </div>
  );
}
