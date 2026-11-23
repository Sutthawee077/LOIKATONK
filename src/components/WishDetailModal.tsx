"use client";

import React, { useState } from "react";
import { Heart, Share2, X, Clock } from "lucide-react";
import {
  KRATHONG_BASES,
  KRATHONG_CANDLES,
  KRATHONG_FLOWERS,
  KRATHONG_TOPPINGS,
  getOptionMeta,
  type KrathongItem,
} from "@/types/krathong";
import { KrathongSvg } from "./KrathongSvg";

interface WishDetailModalProps {
  krathong: KrathongItem | null;
  hasLiked: boolean;
  isMine: boolean;
  onClose: () => void;
  onLike: (id: string) => Promise<void>;
  onOpenShareCard: (krathong: KrathongItem) => void;
}

function formatThaiTime(ms: number): string {
  try {
    return new Date(ms).toLocaleString("th-TH", {
      hour: "2-digit",
      minute: "2-digit",
      day: "numeric",
      month: "short",
    });
  } catch {
    return "เมื่อสักครู่";
  }
}

export function WishDetailModal({
  krathong,
  hasLiked,
  isMine,
  onClose,
  onLike,
  onOpenShareCard,
}: WishDetailModalProps) {
  const [bursting, setBursting] = useState(false);

  if (!krathong) return null;

  const baseMeta = getOptionMeta(KRATHONG_BASES, krathong.base);
  const flowerMeta = getOptionMeta(KRATHONG_FLOWERS, krathong.flower);
  const candleMeta = getOptionMeta(KRATHONG_CANDLES, krathong.candle);
  const toppingMeta = getOptionMeta(KRATHONG_TOPPINGS, krathong.topping);

  const handleHeart = async () => {
    if (hasLiked) return;
    setBursting(true);
    await onLike(krathong.id);
    setTimeout(() => setBursting(false), 650);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby="wish-detail-title"
    >
      <div className="relative w-full max-w-lg overflow-hidden rounded-xl border border-[#c9a461]/40 bg-gradient-to-b from-[#14100c] via-[#0e0b08] to-[#080604] text-[#efe6d5] shadow-2xl ring-1 ring-[#c9a461]/15">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 z-10 rounded p-1.5 text-[#a3947a] transition hover:bg-[#c9a461]/15 hover:text-[#f2e2c2]"
          aria-label="ปิดหน้าต่าง"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="relative flex flex-col items-center border-b border-[#c9a461]/20 bg-gradient-to-b from-[#1a150f] to-transparent px-6 pt-6 pb-4">
          <div className="flex flex-wrap items-center justify-center gap-2">
            {isMine && (
              <span className="rounded border border-[#c9a461]/55 bg-[#c9a461]/20 px-2.5 py-0.5 text-[11px] font-medium text-[#e5c98b]">
                กระทงของคุณ
              </span>
            )}
            <span className="rounded border border-[#c9a461]/25 bg-[#17120d] px-3 py-0.5 text-[11px] text-[#d6c29d]">
              {candleMeta.subtitle}
            </span>
          </div>

          <div className="my-2 animate-bob">
            <KrathongSvg
              base={krathong.base}
              flower={krathong.flower}
              candle={krathong.candle}
              topping={krathong.topping}
              size={188}
            />
          </div>

          <h3 id="wish-detail-title" className="font-serif text-lg font-semibold text-[#f2e2c2]">
            {krathong.name}
          </h3>
          <p className="mt-0.5 inline-flex items-center gap-1 text-xs text-[#9c8c72]">
            <Clock className="h-3 w-3" />
            ลอยเมื่อ {formatThaiTime(krathong.createdAt)}
          </p>
        </div>

        <div className="space-y-4 p-6">
          <div className="rounded-lg border border-[#c9a461]/25 bg-[#16110c] p-4">
            <p className="text-center text-sm leading-relaxed text-[#f2e8d5] sm:text-base">
              “{krathong.wish}”
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-1.5 text-[11px] text-[#cbbba0]">
            <span className="rounded border border-[#c9a461]/20 bg-[#14100b] px-2.5 py-1">
              {baseMeta.name}
            </span>
            <span className="rounded border border-[#c9a461]/20 bg-[#14100b] px-2.5 py-1">
              {flowerMeta.name}
            </span>
            <span className="rounded border border-[#c9a461]/20 bg-[#14100b] px-2.5 py-1">
              {toppingMeta.name}
            </span>
          </div>

          <div className="flex flex-col gap-2.5 pt-1 sm:flex-row">
            <button
              type="button"
              onClick={handleHeart}
              disabled={hasLiked}
              className={`flex flex-1 items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition ${
                hasLiked
                  ? "border-[#c97575]/45 bg-[#5c1e26]/35 text-[#f0c7cb]"
                  : "border-[#c9a461]/30 bg-[#19140e] text-[#e8dec9] hover:border-[#c97575]/60 hover:bg-[#5c1e26]/25"
              }`}
            >
              <Heart
                className={`h-4 w-4 transition-transform duration-300 ${
                  hasLiked || bursting ? "scale-125 fill-[#c97575] text-[#c97575]" : "text-[#c97575]"
                }`}
              />
              <span>
                {hasLiked ? "อนุโมทนาแล้ว" : "ร่วมอนุโมทนา"} ({krathong.likes})
              </span>
            </button>

            <button
              type="button"
              onClick={() => onOpenShareCard(krathong)}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-gradient-to-b from-[#dfc185] to-[#ab833e] px-4 py-2.5 text-sm font-semibold text-[#171109] shadow-md transition hover:brightness-110"
            >
              <Share2 className="h-4 w-4" />
              <span>จัดทำบัตรที่ระลึก</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
