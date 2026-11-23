"use client";

import React, { useId } from "react";
import type { LanternColorId } from "@/types/krathong";

interface SkyLanternSvgProps {
  color: LanternColorId;
  size?: number;
  className?: string;
}

const LANTERN_THEMES: Record<
  LanternColorId,
  { top: string; mid: string; bottom: string; glow: string }
> = {
  gold: {
    top: "#7c521b",
    mid: "#c98b34",
    bottom: "#f5dc9b",
    glow: "#e6b45a",
  },
  amber: {
    top: "#6b2e13",
    mid: "#b95625",
    bottom: "#f3c196",
    glow: "#df7f46",
  },
  rose: {
    top: "#681f31",
    mid: "#a63a54",
    bottom: "#ecc0cb",
    glow: "#d5778c",
  },
  sky: {
    top: "#1e3a56",
    mid: "#3c6991",
    bottom: "#cfe1f0",
    glow: "#8fb7d8",
  },
};

export function SkyLanternSvg({
  color,
  size = 64,
  className = "",
}: SkyLanternSvgProps) {
  const uid = useId().replace(/:/g, "");
  const theme = LANTERN_THEMES[color];

  return (
    <svg
      width={size}
      height={size * 1.35}
      viewBox="0 0 80 108"
      className={className}
      role="img"
      aria-label="โคมลอย"
    >
      <defs>
        <radialGradient id={`lantern-halo-${uid}`} cx="50%" cy="62%" r="50%">
          <stop offset="0%" stopColor={theme.glow} stopOpacity="0.55" />
          <stop offset="65%" stopColor={theme.glow} stopOpacity="0.15" />
          <stop offset="100%" stopColor={theme.glow} stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`lantern-body-${uid}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={theme.top} />
          <stop offset="52%" stopColor={theme.mid} />
          <stop offset="100%" stopColor={theme.bottom} />
        </linearGradient>
      </defs>

      <circle cx="40" cy="60" r="36" fill={`url(#lantern-halo-${uid})`} />

      {/* Rice-paper body */}
      <path
        d="M 22 18 Q 40 8 58 18 L 66 56 Q 64 76 52 84 L 28 84 Q 16 76 14 56 Z"
        fill={`url(#lantern-body-${uid})`}
        stroke="#f5e3ba"
        strokeOpacity="0.35"
        strokeWidth="0.9"
      />

      {/* Bamboo frame ribs */}
      <path d="M 32 14 Q 29 50 33 84" fill="none" stroke="#2d1d0c" strokeOpacity="0.28" strokeWidth="0.8" />
      <path d="M 48 14 Q 51 50 47 84" fill="none" stroke="#2d1d0c" strokeOpacity="0.28" strokeWidth="0.8" />

      <ellipse cx="40" cy="84" rx="12" ry="3" fill="none" stroke="#472a10" strokeWidth="1.4" />
      <ellipse cx="40" cy="78" rx="5.5" ry="8.5" fill="#f9e39d" opacity="0.92" />
      <ellipse cx="40" cy="80" rx="2.6" ry="4.5" fill="#fffdf5" />
    </svg>
  );
}
