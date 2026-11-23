"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Volume2,
  VolumeX,
  Search,
  Heart,
  X,
  BookOpen,
  Lock,
} from "lucide-react";
import {
  createKrathong,
  createLantern,
  getLikedKrathongIds,
  getMyKrathongIds,
  getPrivateRoom,
  likeKrathong,
  normalizeRoomCode,
  subscribeKrathongs,
  subscribeLanterns,
} from "@/lib/firebase";
import { festivalAudio } from "@/lib/sound";
import {
  createPhysicsBodyForKrathong,
  getPerspectiveScale,
  stepRiverPhysics,
  type KrathongPhysicsBody,
  type WaterRippleImpulse,
} from "@/lib/riverPhysics";
import {
  type CreateKrathongInput,
  type CreateLanternInput,
  type KrathongItem,
  type PrivateRoomInfo,
  type SkyLanternItem,
} from "@/types/krathong";
import { WatArunBackdrop } from "@/components/WatArunBackdrop";
import { FireworksCanvas, type FireworksHandle } from "@/components/FireworksCanvas";
import { KrathongSvg, RiverKrathongSprite } from "@/components/KrathongSvg";
import { SkyLanternSvg } from "@/components/SkyLanternSvg";
import { KrathongBuilderModal } from "@/components/KrathongBuilderModal";
import { WishDetailModal } from "@/components/WishDetailModal";
import { ShareCardModal } from "@/components/ShareCardModal";
import { LanternModal } from "@/components/LanternModal";
import { PrivateRoomModal } from "@/components/PrivateRoomModal";

function hashString(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

const KRATHONG_RENDER_WIDTH = 150;
// Waterline at y=151 in 220x200 viewBox => 151/200 * (150 * 200 / 220) = 102.95px
const WATERLINE_ANCHOR_PX = 103;

export default function HomePage() {
  const fireworksRef = useRef<FireworksHandle | null>(null);
  const bodiesRef = useRef<Map<string, KrathongPhysicsBody>>(new Map());
  const ripplesRef = useRef<WaterRippleImpulse[]>([]);
  const domNodesRef = useRef<Map<string, HTMLDivElement>>(new Map());
  const domWriteCacheRef = useRef<Map<string, { z: number; lean: number }>>(new Map());
  const hoveredIdRef = useRef<string | null>(null);
  const nextRippleIdRef = useRef(1);
  const lastDragRippleMsRef = useRef(0);
  const pointerDownOnWaterRef = useRef(false);

  const [krathongs, setKrathongs] = useState<KrathongItem[]>([]);
  const [lanterns, setLanterns] = useState<SkyLanternItem[]>([]);

  const [myIds, setMyIds] = useState<string[]>([]);
  const [likedIds, setLikedIds] = useState<string[]>([]);
  const [justLaunchedId, setJustLaunchedId] = useState<string | null>(null);
  const justLaunchedIdRef = useRef<string | null>(null);

  const [musicOn, setMusicOn] = useState(false);
  const [highlightMine, setHighlightMine] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerSearch, setDrawerSearch] = useState("");

  const [builderOpen, setBuilderOpen] = useState(false);
  const [lanternModalOpen, setLanternModalOpen] = useState(false);
  const [roomModalOpen, setRoomModalOpen] = useState(false);
  const [activeRoom, setActiveRoom] = useState<PrivateRoomInfo | null>(null);
  const [roomResolved, setRoomResolved] = useState(false);
  const [selectedKrathongId, setSelectedKrathongId] = useState<string | null>(null);
  const [selectedLantern, setSelectedLantern] = useState<SkyLanternItem | null>(null);
  const [shareCardKrathong, setShareCardKrathong] = useState<KrathongItem | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3600);
  }, []);

  useEffect(() => {
    setMyIds(getMyKrathongIds());
    setLikedIds(getLikedKrathongIds());

    const params = new URLSearchParams(window.location.search);
    const codeParam = normalizeRoomCode(params.get("room"));
    if (!codeParam) {
      setRoomResolved(true);
      return;
    }

    let cancelled = false;
    void getPrivateRoom(codeParam).then((found) => {
      if (cancelled) return;
      if (found) {
        setActiveRoom(found);
        showToast(`เข้าสู่ห้องส่วนตัว "${found.name}" (${found.code}) แล้ว`);
      } else {
        window.history.replaceState(null, "", window.location.pathname);
        showToast(`ไม่พบห้องส่วนตัวรหัส "${codeParam}" แสดงท่าน้ำหลักแทน`);
      }
      setRoomResolved(true);
    });

    return () => {
      cancelled = true;
    };
  }, [showToast]);

  useEffect(() => {
    if (!roomResolved) return;
    const roomCode = activeRoom?.code ?? null;
    const unsubKrathongs = subscribeKrathongs(
      (items) => setKrathongs(items),
      undefined,
      roomCode
    );
    const unsubLanterns = subscribeLanterns((items) => setLanterns(items), roomCode);

    return () => {
      unsubKrathongs();
      unsubLanterns();
    };
  }, [roomResolved, activeRoom?.code]);

  // Synchronize physics bodies Map when krathongs list updates (preserving active motion)
  useEffect(() => {
    const nowSec = performance.now() * 0.001;
    const currentMap = bodiesRef.current;
    const activeIds = new Set(krathongs.map((k) => k.id));

    currentMap.forEach((_, id) => {
      if (!activeIds.has(id)) {
        currentMap.delete(id);
        domWriteCacheRef.current.delete(id);
      }
    });

    krathongs.forEach((item, idx) => {
      const existing = currentMap.get(item.id);
      if (existing) {
        existing.candle = item.candle;
      } else {
        const isNew = justLaunchedIdRef.current === item.id;
        currentMap.set(
          item.id,
          createPhysicsBodyForKrathong(item, idx, nowSec, isNew)
        );
      }
    });
  }, [krathongs]);

  // 60 FPS Coupled Hydrodynamic & Buoyancy Loop (zero React re-renders per frame)
  useEffect(() => {
    let rafId = 0;
    let lastMs = performance.now();

    const tick = (nowMs: number) => {
      const dtSec = (nowMs - lastMs) * 0.001;
      lastMs = nowMs;
      const tSec = nowMs * 0.001;

      const bodies = Array.from(bodiesRef.current.values());
      stepRiverPhysics(bodies, ripplesRef.current, dtSec, tSec, hoveredIdRef.current);

      const vw = window.innerWidth;
      const vh = window.innerHeight;

      for (const b of bodies) {
        const el = domNodesRef.current.get(b.id);
        if (!el) continue;

        const screenX = b.xNorm * vw;
        const screenY = (0.62 + b.yNorm * 0.38) * vh + b.heaveZ;
        const pScale = getPerspectiveScale(b.yNorm);
        const tiltDeg = b.roll + b.yawDeg * 0.3;

        el.style.transform = `translate3d(${screenX.toFixed(1)}px, ${screenY.toFixed(1)}px, 0) scale(${pScale.toFixed(3)}) rotate(${tiltDeg.toFixed(2)}deg)`;

        const nextZ = Math.round(12 + b.yNorm * 16);
        let cached = domWriteCacheRef.current.get(b.id);
        if (!cached) {
          cached = { z: -1, lean: 999 };
          domWriteCacheRef.current.set(b.id, cached);
        }
        if (cached.z !== nextZ) {
          cached.z = nextZ;
          el.style.zIndex = String(nextZ);
        }
        if (Math.abs(b.flameLean - cached.lean) >= 0.15) {
          cached.lean = b.flameLean;
          el.style.setProperty("--flame-lean", `${b.flameLean.toFixed(2)}deg`);
        }
        if (el.style.opacity !== "1") {
          el.style.opacity = "1";
        }
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, []);

  // Auto-launch celebratory fireworks over Wat Arun with natural 5-6s rhythm while tab is visible
  useEffect(() => {
    const unlockOnce = () => {
      festivalAudio.unlock();
    };
    window.addEventListener("pointerdown", unlockOnce, { once: true, passive: true });
    window.addEventListener("keydown", unlockOnce, { once: true, passive: true });

    let active = true;
    let timerId: ReturnType<typeof setTimeout> | null = null;

    const scheduleNext = () => {
      const delayMs = 4600 + Math.random() * 1800; // ~4.6-6.4 seconds
      timerId = setTimeout(() => {
        if (!active) return;
        if (document.visibilityState === "visible") {
          const r = Math.random();
          const burstCount = r > 0.82 ? 3 : r > 0.35 ? 2 : 1;
          fireworksRef.current?.launchBurst(burstCount);
        }
        scheduleNext();
      }, delayMs);
    };

    scheduleNext();

    return () => {
      active = false;
      if (timerId !== null) clearTimeout(timerId);
      window.removeEventListener("pointerdown", unlockOnce);
      window.removeEventListener("keydown", unlockOnce);
    };
  }, []);

  const spawnWaterRipple = useCallback(
    (clientX: number, clientY: number, strength = 1.0) => {
      const vw = window.innerWidth || 1;
      const vh = window.innerHeight || 1;
      const xNorm = clientX / vw;
      const yNorm = (clientY - vh * 0.62) / (vh * 0.38);
      if (yNorm < 0 || yNorm > 1) return;

      ripplesRef.current.push({
        id: nextRippleIdRef.current++,
        xNorm,
        yNorm,
        createdAtSec: performance.now() * 0.001,
        strength,
        maxRadiusNorm: 0.48,
        speed: 0.14,
      });
    },
    []
  );

  const selectedKrathong = useMemo(
    () => krathongs.find((k) => k.id === selectedKrathongId) ?? null,
    [krathongs, selectedKrathongId]
  );

  const myLatestKrathong = useMemo(() => {
    if (myIds.length === 0) return null;
    return krathongs.find((k) => myIds.includes(k.id)) ?? null;
  }, [krathongs, myIds]);

  const filteredDrawerKrathongs = useMemo(() => {
    const q = drawerSearch.trim().toLowerCase();
    const list = highlightMine ? krathongs.filter((k) => myIds.includes(k.id)) : krathongs;
    if (!q) return list;
    return list.filter(
      (k) => k.name.toLowerCase().includes(q) || k.wish.toLowerCase().includes(q)
    );
  }, [krathongs, drawerSearch, highlightMine, myIds]);

  const handleToggleMusic = () => {
    const playing = festivalAudio.toggleMusic();
    setMusicOn(playing);
  };

  const handleLaunchFireworks = () => {
    festivalAudio.unlock();
    fireworksRef.current?.launchBurst(4);
  };

  const handleEnterRoom = (room: PrivateRoomInfo) => {
    bodiesRef.current.clear();
    domWriteCacheRef.current.clear();
    setSelectedKrathongId(null);
    setSelectedLantern(null);
    setActiveRoom(room);
    setRoomModalOpen(false);
    window.history.replaceState(null, "", `${window.location.pathname}?room=${room.code}`);
    showToast(`เข้าสู่ห้องส่วนตัว "${room.name}" (รหัส ${room.code}) แล้ว`);
  };

  const handleLeaveRoom = () => {
    bodiesRef.current.clear();
    domWriteCacheRef.current.clear();
    setSelectedKrathongId(null);
    setSelectedLantern(null);
    setActiveRoom(null);
    window.history.replaceState(null, "", window.location.pathname);
    showToast("กลับสู่ท่าน้ำหลักวัดอรุณเรียบร้อยแล้ว");
  };

  const handleLaunchKrathong = async (input: CreateKrathongInput) => {
    const created = await createKrathong(input, activeRoom?.code);
    setMyIds(getMyKrathongIds());
    justLaunchedIdRef.current = created.id;
    setJustLaunchedId(created.id);

    const nowSec = performance.now() * 0.001;
    const dropBody = createPhysicsBodyForKrathong(created, 0, nowSec, true);
    bodiesRef.current.set(created.id, dropBody);

    // Expanding water splash ripple where krathong touches Chao Phraya
    ripplesRef.current.push({
      id: nextRippleIdRef.current++,
      xNorm: dropBody.xNorm,
      yNorm: dropBody.yNorm,
      createdAtSec: nowSec,
      strength: 1.45,
      maxRadiusNorm: 0.55,
      speed: 0.16,
    });

    setTimeout(() => {
      if (justLaunchedIdRef.current === created.id) {
        justLaunchedIdRef.current = null;
      }
      setJustLaunchedId((prev) => (prev === created.id ? null : prev));
    }, 10000);

    festivalAudio.playWaterSplash();
    setTimeout(() => {
      fireworksRef.current?.launchBurst(3);
    }, 300);

    showToast("ลอยกระทงลงสู่สายน้ำเจ้าพระยาเรียบร้อยแล้ว คลิกผิวน้ำเพื่อวักน้ำส่งกระทงได้ครับ");
  };

  const handleReleaseLantern = async (input: CreateLanternInput) => {
    await createLantern(input, activeRoom?.code);
    festivalAudio.playLanternWhoosh();
    showToast("ปล่อยโคมลอยขึ้นสู่ฟากฟ้าเหนือวัดอรุณเรียบร้อยแล้ว");
  };

  const handleLikeKrathong = async (id: string) => {
    if (likedIds.includes(id)) return;
    festivalAudio.playChimeSound();
    await likeKrathong(id, activeRoom?.code);
    setLikedIds(getLikedKrathongIds());
  };

  const handleOpenMyCard = () => {
    const target = myLatestKrathong ?? krathongs[0] ?? null;
    if (!target) {
      showToast("ยังไม่มีกระทงสำหรับจัดทำบัตรที่ระลึก");
      return;
    }
    if (!myLatestKrathong) {
      showToast("แสดงบัตรตัวอย่าง — ลอยกระทงของคุณเพื่อสร้างบัตรที่ระลึกส่วนตัวได้");
    }
    setShareCardKrathong(target);
  };

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-[#060504] select-none">
      {/* 1. Photorealistic Wat Arun & Coupled Chao Phraya River Canvas */}
      <WatArunBackdrop bodiesRef={bodiesRef} ripplesRef={ripplesRef} />

      {/* Interactive Chao Phraya Water Surface ("วักน้ำส่งกระทง") */}
      <div
        className="absolute inset-x-0 bottom-0 top-[62%] z-10 cursor-pointer"
        onPointerDown={(e) => {
          pointerDownOnWaterRef.current = true;
          spawnWaterRipple(e.clientX, e.clientY, 1.15);
          festivalAudio.playWaterSplash();
        }}
        onPointerMove={(e) => {
          if (!pointerDownOnWaterRef.current) return;
          const now = performance.now();
          if (now - lastDragRippleMsRef.current < 120) return;
          lastDragRippleMsRef.current = now;
          spawnWaterRipple(e.clientX, e.clientY, 0.72);
        }}
        onPointerUp={() => {
          pointerDownOnWaterRef.current = false;
        }}
        onPointerLeave={() => {
          pointerDownOnWaterRef.current = false;
        }}
        aria-label="ผิวน้ำเจ้าพระยา คลิกหรือลากเพื่อวักน้ำส่งกระทง"
      />

      {/* 2. Sky Lanterns Layer (above horizon) */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-[56%] overflow-hidden">
        {lanterns.slice(0, 16).map((lantern, idx) => {
          const h = hashString(lantern.id);
          const leftPct = 7 + ((h + idx * 19) % 84);
          const duration = 28 + (h % 16);
          const isBrandNew = Date.now() - lantern.createdAt < 15000;
          const delay = isBrandNew ? 0 : -((h % duration) + idx * 1.9);

          return (
            <button
              key={lantern.id}
              type="button"
              onClick={() => {
                festivalAudio.playChimeSound();
                setSelectedLantern(lantern);
              }}
              className="lantern-sky-rise group pointer-events-auto absolute bottom-0 flex flex-col items-center focus:outline-none"
              style={{
                left: `${leftPct}%`,
                animationDuration: `${duration}s`,
                animationDelay: `${delay}s`,
              }}
              title={`โคมลอยของ ${lantern.name}: ${lantern.wish}`}
            >
              <SkyLanternSvg
                color={lantern.color}
                size={34 + (h % 14)}
                className="transition-transform duration-300 group-hover:scale-110"
              />
              <span className="pointer-events-none -mt-1 max-w-[110px] truncate border border-[#c9a461]/30 bg-[#0e0b08]/95 px-2 py-0.5 text-[10px] text-[#e5c98b] opacity-0 transition group-hover:opacity-100">
                {lantern.name}
              </span>
            </button>
          );
        })}
      </div>

      {/* 3. Physics-Driven Floating Krathongs */}
      <div className="pointer-events-none absolute inset-0">
        {krathongs.map((item) => {
          const isMine = myIds.includes(item.id);
          const dimmed = highlightMine && !isMine;
          const isBrandNew = justLaunchedId === item.id;

          return (
            <div
              key={item.id}
              ref={(el) => {
                if (el) domNodesRef.current.set(item.id, el);
                else domNodesRef.current.delete(item.id);
              }}
              className="pointer-events-none absolute left-0 top-0"
              style={{
                opacity: 0,
                transformOrigin: "0 0",
                willChange: "transform",
              }}
            >
              <button
                type="button"
                onPointerEnter={() => {
                  hoveredIdRef.current = item.id;
                }}
                onPointerLeave={() => {
                  if (hoveredIdRef.current === item.id) {
                    hoveredIdRef.current = null;
                  }
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  festivalAudio.playChimeSound();
                  setSelectedKrathongId(item.id);
                }}
                style={{
                  transform: `translate(-50%, -${WATERLINE_ANCHOR_PX}px)`,
                }}
                className={`group pointer-events-auto relative flex flex-col items-center transition-opacity duration-300 focus:outline-none ${
                  dimmed ? "opacity-25" : "opacity-100"
                }`}
                aria-label={`ดูกระทงและคำอธิษฐานของ ${item.name}`}
              >
                {/* Hover Wish Tooltip (no backdrop-blur on moving elements) */}
                <div className="pointer-events-none absolute -top-14 z-30 w-52 rounded-lg border border-[#c9a461]/45 bg-[#110d09]/95 px-3 py-2 text-center opacity-0 shadow-2xl transition-opacity duration-200 group-hover:opacity-100">
                  <div className="flex items-center justify-center gap-1.5 text-xs font-medium text-[#e5c98b]">
                    <span className="truncate">{item.name}</span>
                    {item.likes > 0 && (
                      <span className="inline-flex items-center gap-0.5 text-[10px] text-[#d99b9b]">
                        <Heart className="h-2.5 w-2.5 fill-[#c97575] text-[#c97575]" />
                        {item.likes}
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-[#efe6d5]/90">
                    “{item.wish}”
                  </p>
                </div>

                {/* GPU Bitmap Sprite Krathong + 5-node live flame overlay */}
                <RiverKrathongSprite
                  base={item.base}
                  flower={item.flower}
                  candle={item.candle}
                  topping={item.topping}
                  isHighlighted={(highlightMine && isMine) || isBrandNew}
                  size={KRATHONG_RENDER_WIDTH}
                />

                {/* Editorial Nameplate */}
                <span
                  className={`-mt-2 max-w-[130px] truncate rounded px-2 py-0.5 text-[10px] tracking-wide transition ${
                    isMine
                      ? "border border-[#c9a461]/55 bg-[#120e09]/80 text-[#e5c98b]"
                      : "bg-[#090807]/50 text-[#e8dec9]/75 group-hover:text-[#f3e6cc]"
                  }`}
                >
                  {item.name}
                </span>
              </button>
            </div>
          );
        })}
      </div>

      {/* 4. Fireworks Canvas Overlay */}
      <FireworksCanvas ref={fireworksRef} />

      {/* 5. Top Editorial Header & Minimal Heritage Menu */}
      <header className="pointer-events-none fixed inset-x-0 top-0 z-30 flex flex-wrap items-start justify-between gap-3 px-4 py-4 sm:px-7 sm:py-5">
        <div className="pointer-events-auto drop-shadow-[0_2px_10px_rgba(0,0,0,0.85)]">
          <h1 className="font-serif text-xl font-semibold tracking-wide text-[#f2e2c2] sm:text-2xl">
            ลอยกระทงริมแม่น้ำเจ้าพระยา
          </h1>
          <p className="mt-0.5 text-xs tracking-wide text-[#c9a461] sm:text-[13px]">
            ณ ท่าน้ำวัดอรุณราชวราราม • คืนเพ็ญเดือนสิบสอง
          </p>
          <p className="mt-1 text-[11px] text-[#e8dec9]/70">
            กระทงร่วมลอย {krathongs.length} ใบ • โคมลอย {lanterns.length} ดวง
          </p>
          {activeRoom && (
            <div className="mt-2 inline-flex flex-wrap items-center gap-2 rounded-lg border border-[#c9a461]/45 bg-[#0e0b08]/85 px-3 py-1.5 text-xs backdrop-blur-md">
              <span className="inline-flex items-center gap-1.5 font-medium text-[#e5c98b]">
                <Lock className="h-3 w-3 text-[#c9a461]" />
                ห้องส่วนตัว: {activeRoom.name}
              </span>
              <span className="rounded bg-[#c9a461]/15 px-1.5 py-0.5 font-mono text-[11px] tracking-wider text-[#f2e2c2]">
                {activeRoom.code}
              </span>
              <button
                type="button"
                onClick={() => setRoomModalOpen(true)}
                className="text-[11px] text-[#c9a461] underline-offset-2 hover:underline"
              >
                แชร์ห้อง
              </button>
              <span className="text-[#c9a461]/30">•</span>
              <button
                type="button"
                onClick={handleLeaveRoom}
                className="text-[11px] text-[#d9a2a2] underline-offset-2 hover:underline"
              >
                กลับท่าน้ำหลัก
              </button>
            </div>
          )}
        </div>

        <div className="pointer-events-auto flex flex-wrap items-center rounded-lg border border-[#c9a461]/30 bg-[#0e0b08]/75 p-1 text-xs text-[#e8dec9] shadow-lg backdrop-blur-md">
          <button
            type="button"
            onClick={() => setRoomModalOpen(true)}
            className={`inline-flex items-center gap-1.5 rounded px-2.5 py-1.5 transition ${
              activeRoom
                ? "bg-[#c9a461]/25 text-[#f2dfba]"
                : "hover:bg-[#c9a461]/10 hover:text-[#f2dfba]"
            }`}
          >
            <Lock className="h-3.5 w-3.5 text-[#c9a461]" />
            <span>{activeRoom ? activeRoom.code : "ห้องส่วนตัว"}</span>
          </button>

          <span className="h-4 w-px bg-[#c9a461]/20" aria-hidden="true" />
          <button
            type="button"
            onClick={() => {
              const next = !highlightMine;
              setHighlightMine(next);
              if (next && myIds.length === 0) {
                showToast("ยังไม่มีกระทงของคุณในเบราว์เซอร์นี้ ลองกด 'ลอยกระทงอธิษฐาน'");
              }
            }}
            className={`inline-flex items-center gap-1.5 rounded px-2.5 py-1.5 transition ${
              highlightMine
                ? "bg-[#c9a461]/25 text-[#f2dfba]"
                : "hover:bg-[#c9a461]/10 hover:text-[#f2dfba]"
            }`}
          >
            <Search className="h-3.5 w-3.5 text-[#c9a461]" />
            <span className="hidden md:inline">กระทงของฉัน</span>
            {myIds.length > 0 && (
              <span className="text-[10px] text-[#c9a461]">({myIds.length})</span>
            )}
          </button>

          <span className="h-4 w-px bg-[#c9a461]/20" aria-hidden="true" />

          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="inline-flex items-center gap-1.5 rounded px-2.5 py-1.5 transition hover:bg-[#c9a461]/10 hover:text-[#f2dfba]"
          >
            <BookOpen className="h-3.5 w-3.5 text-[#c9a461]" />
            <span className="hidden md:inline">สมุดคำอธิษฐาน</span>
          </button>

          <span className="h-4 w-px bg-[#c9a461]/20" aria-hidden="true" />

          <button
            type="button"
            onClick={handleToggleMusic}
            className={`inline-flex items-center gap-1.5 rounded px-2.5 py-1.5 transition ${
              musicOn
                ? "bg-[#c9a461]/20 text-[#f2dfba]"
                : "hover:bg-[#c9a461]/10 hover:text-[#f2dfba]"
            }`}
            aria-label={musicOn ? "ปิดดนตรีบรรเลง" : "เปิดดนตรีบรรเลง"}
          >
            {musicOn ? (
              <Volume2 className="h-3.5 w-3.5 text-[#e5c98b]" />
            ) : (
              <VolumeX className="h-3.5 w-3.5 text-[#9c8966]" />
            )}
            <span className="hidden sm:inline">
              {musicOn ? "กำลังบรรเลง" : "ดนตรีบรรเลง"}
            </span>
          </button>
        </div>
      </header>

      {/* Empty Private Room Welcome Banner */}
      {roomResolved && activeRoom && krathongs.length === 0 && (
        <div className="pointer-events-none fixed inset-x-0 top-[68%] z-20 flex justify-center px-4">
          <div className="pointer-events-auto max-w-md rounded-xl border border-[#c9a461]/35 bg-[#0e0b08]/82 px-5 py-4 text-center shadow-2xl backdrop-blur-md">
            <p className="font-serif text-sm font-semibold text-[#e5c98b]">
              ห้องส่วนตัว “{activeRoom.name}” พร้อมแล้ว
            </p>
            <p className="mt-1 text-xs text-[#cbbba0]">
              ประดิษฐ์กระทงใบแรกของห้อง หรือส่งรหัส{" "}
              <span className="font-mono font-semibold text-[#f2e2c2]">{activeRoom.code}</span>{" "}
              ให้เพื่อนเข้ามาร่วมลอยด้วยกันได้เลยครับ
            </p>
          </div>
        </div>
      )}

      {/* Subtle Water Interaction Hint */}
      <div className="pointer-events-none fixed inset-x-0 bottom-[76px] z-20 flex justify-center px-4">
        <p className="text-[11px] tracking-wide text-[#e8dec9]/50 drop-shadow-[0_1px_4px_rgba(0,0,0,0.9)]">
          คลิกหรือลากบนผิวน้ำเพื่อวักน้ำส่งกระทง • คลิกที่กระทงเพื่ออ่านคำอธิษฐาน
        </p>
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="pointer-events-none fixed inset-x-0 top-24 z-40 flex justify-center px-4">
          <div className="rounded-lg border border-[#c9a461]/45 bg-[#120e0a]/92 px-4 py-2 text-center text-xs font-medium text-[#f2e2c2] shadow-2xl backdrop-blur-md sm:text-sm">
            {toastMessage}
          </div>
        </div>
      )}

      {/* 6. Bottom Dark Teak & Antique Gold Leaf Dock */}
      <nav
        aria-label="เมนูหลักลอยกระทง"
        className="pointer-events-none fixed inset-x-0 bottom-4 z-30 flex justify-center px-3"
      >
        <div className="pointer-events-auto flex flex-wrap items-center justify-center gap-2 rounded-xl border border-[#c9a461]/35 bg-[#0e0b08]/88 p-2 shadow-[0_14px_40px_rgba(0,0,0,0.82)] ring-1 ring-[#c9a461]/10 backdrop-blur-xl sm:gap-2.5 sm:px-3">
          <button
            type="button"
            onClick={() => setBuilderOpen(true)}
            className="rounded-lg bg-gradient-to-b from-[#dfc185] to-[#ab833e] px-4 py-2.5 text-xs font-semibold tracking-wide text-[#171109] shadow-md transition hover:brightness-110 sm:px-5 sm:text-sm"
          >
            ลอยกระทงอธิษฐาน
          </button>

          <button
            type="button"
            onClick={() => setLanternModalOpen(true)}
            className="rounded-lg border border-[#c9a461]/25 bg-[#1a140e]/80 px-3.5 py-2.5 text-xs font-medium text-[#e8dec9] transition hover:border-[#c9a461]/55 hover:bg-[#c9a461]/15 sm:text-sm"
          >
            ปล่อยโคมลอย
          </button>

          <button
            type="button"
            onClick={handleLaunchFireworks}
            className="rounded-lg border border-[#c9a461]/25 bg-[#1a140e]/80 px-3.5 py-2.5 text-xs font-medium text-[#e8dec9] transition hover:border-[#c9a461]/55 hover:bg-[#c9a461]/15 sm:text-sm"
          >
            จุดพลุเหนือลำน้ำ
          </button>

          <button
            type="button"
            onClick={handleOpenMyCard}
            className="rounded-lg border border-[#c9a461]/25 bg-[#1a140e]/80 px-3.5 py-2.5 text-xs font-medium text-[#e8dec9] transition hover:border-[#c9a461]/55 hover:bg-[#c9a461]/15 sm:text-sm"
          >
            บัตรที่ระลึก
          </button>
        </div>
      </nav>

      {/* 7. Wishes Ledger Slide-Over Drawer */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-40 flex justify-end bg-black/65 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="สมุดคำอธิษฐาน"
        >
          <div className="flex h-full w-full max-w-md flex-col border-l border-[#c9a461]/30 bg-[#0d0a07] text-[#efe6d5] shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#c9a461]/20 px-5 py-4">
              <div>
                <h2 className="font-serif text-base font-semibold text-[#e5c98b]">
                  สมุดคำอธิษฐาน ({filteredDrawerKrathongs.length})
                </h2>
                <p className="text-xs text-[#a3947a]">
                  คลิกที่กระทงเพื่ออ่านคำอธิษฐานหรือร่วมอนุโมทนา
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="rounded p-1.5 text-[#a3947a] transition hover:bg-[#c9a461]/15 hover:text-[#f2e2c2]"
                aria-label="ปิดสมุดคำอธิษฐาน"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="border-b border-[#c9a461]/15 p-3">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-[#8c7b60]" />
                <input
                  type="text"
                  value={drawerSearch}
                  onChange={(e) => setDrawerSearch(e.target.value)}
                  placeholder="ค้นหาชื่อ หรือคำอธิษฐาน..."
                  className="w-full rounded-lg border border-[#c9a461]/25 bg-[#17120d] py-2 pl-9 pr-3 text-sm text-[#f2e2c2] placeholder-[#73644c] outline-none focus:border-[#c9a461]"
                />
              </div>
            </div>

            <div className="flex-1 space-y-2.5 overflow-y-auto p-3">
              {filteredDrawerKrathongs.length === 0 ? (
                <div className="py-12 text-center text-sm text-[#8c7b60]">
                  ไม่พบคำอธิษฐานที่ค้นหา
                </div>
              ) : (
                filteredDrawerKrathongs.map((k) => {
                  const mine = myIds.includes(k.id);
                  return (
                    <button
                      key={k.id}
                      type="button"
                      onClick={() => {
                        festivalAudio.playChimeSound();
                        setSelectedKrathongId(k.id);
                      }}
                      className={`flex w-full items-center gap-3 rounded-lg border p-3 text-left transition hover:bg-[#1c1610] ${
                        mine
                          ? "border-[#c9a461]/55 bg-[#1b150e]"
                          : "border-[#c9a461]/18 bg-[#130f0b]"
                      }`}
                    >
                      <KrathongSvg
                        base={k.base}
                        flower={k.flower}
                        candle={k.candle}
                        topping={k.topping}
                        showWaterReflection={false}
                        size={64}
                        className="shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate text-sm font-semibold text-[#e5c98b]">
                            {k.name}
                            {mine ? " (ของคุณ)" : ""}
                          </span>
                          <span className="inline-flex shrink-0 items-center gap-1 text-xs text-[#c97575]">
                            <Heart className="h-3 w-3 fill-[#c97575] text-[#c97575]" />
                            {k.likes}
                          </span>
                        </div>
                        <p className="mt-1 line-clamp-2 text-xs text-[#d6cbb7]">
                          “{k.wish}”
                        </p>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* 8. Sky Lantern Wish Popover */}
      {selectedLantern && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
        >
          <div className="heritage-panel relative w-full max-w-sm rounded-xl p-6 text-center text-[#efe6d5]">
            <button
              type="button"
              onClick={() => setSelectedLantern(null)}
              className="absolute right-4 top-4 rounded p-1.5 text-[#a3947a] hover:bg-[#c9a461]/15 hover:text-[#f2e2c2]"
              aria-label="ปิด"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="mx-auto mb-2 flex animate-bob justify-center">
              <SkyLanternSvg color={selectedLantern.color} size={74} />
            </div>
            <p className="text-xs tracking-wide text-[#c9a461]">คำอธิษฐานบนโคมลอย</p>
            <h3 className="mt-0.5 font-serif text-base font-semibold text-[#f2e2c2]">
              {selectedLantern.name}
            </h3>
            <div className="mt-3 rounded-lg border border-[#c9a461]/25 bg-[#17120d] p-3.5">
              <p className="text-sm leading-relaxed text-[#efe6d5]">
                “{selectedLantern.wish}”
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 9. Modals */}
      <KrathongBuilderModal
        isOpen={builderOpen}
        onClose={() => setBuilderOpen(false)}
        onLaunch={handleLaunchKrathong}
      />

      <LanternModal
        isOpen={lanternModalOpen}
        onClose={() => setLanternModalOpen(false)}
        onRelease={handleReleaseLantern}
      />

      <WishDetailModal
        krathong={selectedKrathong}
        hasLiked={selectedKrathong ? likedIds.includes(selectedKrathong.id) : false}
        isMine={selectedKrathong ? myIds.includes(selectedKrathong.id) : false}
        onClose={() => setSelectedKrathongId(null)}
        onLike={handleLikeKrathong}
        onOpenShareCard={(k) => {
          setSelectedKrathongId(null);
          setShareCardKrathong(k);
        }}
      />

      <ShareCardModal
        krathong={shareCardKrathong}
        activeRoom={activeRoom}
        onClose={() => setShareCardKrathong(null)}
      />

      <PrivateRoomModal
        isOpen={roomModalOpen}
        activeRoom={activeRoom}
        onClose={() => setRoomModalOpen(false)}
        onEnterRoom={handleEnterRoom}
        onLeaveRoom={handleLeaveRoom}
      />
    </main>
  );
}
