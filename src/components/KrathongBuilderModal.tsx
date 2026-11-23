"use client";

import React, { useState } from "react";
import { Shuffle, X, Check } from "lucide-react";
import {
  KRATHONG_BASES,
  KRATHONG_CANDLES,
  KRATHONG_FLOWERS,
  KRATHONG_TOPPINGS,
  WISH_TEMPLATES,
  getOptionMeta,
  type CreateKrathongInput,
  type KrathongBaseId,
  type KrathongCandleId,
  type KrathongFlowerId,
  type KrathongToppingId,
} from "@/types/krathong";
import { KrathongSvg } from "./KrathongSvg";

interface KrathongBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLaunch: (input: CreateKrathongInput) => Promise<void>;
}

type BuilderTab = "base" | "flower" | "candle" | "topping";

export function KrathongBuilderModal({
  isOpen,
  onClose,
  onLaunch,
}: KrathongBuilderModalProps) {
  const [tab, setTab] = useState<BuilderTab>("base");
  const [base, setBase] = useState<KrathongBaseId>("banana-leaf");
  const [flower, setFlower] = useState<KrathongFlowerId>("marigold");
  const [candle, setCandle] = useState<KrathongCandleId>("gold-wealth");
  const [topping, setTopping] = useState<KrathongToppingId>("mini-garland");
  const [name, setName] = useState("");
  const [wish, setWish] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [launchingAnim, setLaunchingAnim] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const candleMeta = getOptionMeta(KRATHONG_CANDLES, candle);

  const handleRandomize = () => {
    setBase(KRATHONG_BASES[Math.floor(Math.random() * KRATHONG_BASES.length)].id);
    setFlower(KRATHONG_FLOWERS[Math.floor(Math.random() * KRATHONG_FLOWERS.length)].id);
    setCandle(KRATHONG_CANDLES[Math.floor(Math.random() * KRATHONG_CANDLES.length)].id);
    setTopping(KRATHONG_TOPPINGS[Math.floor(Math.random() * KRATHONG_TOPPINGS.length)].id);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedWish = wish.trim();
    if (!trimmedWish) {
      setError("กรุณาเขียนคำอธิษฐานก่อนลอยกระทงนะครับ");
      return;
    }

    setError("");
    setSubmitting(true);
    setLaunchingAnim(true);

    try {
      await onLaunch({
        name: name.trim() || "ผู้ไม่ประสงค์ออกนาม",
        wish: trimmedWish,
        base,
        flower,
        candle,
        topping,
      });
      setTimeout(() => {
        setLaunchingAnim(false);
        setSubmitting(false);
        setWish("");
        onClose();
      }, 550);
    } catch {
      setLaunchingAnim(false);
      setSubmitting(false);
      setError("เกิดข้อผิดพลาดระหว่างปล่อยกระทง กรุณาลองอีกครั้ง");
    }
  };

  const currentOptions =
    tab === "base"
      ? KRATHONG_BASES.map((o) => ({ ...o, selected: base === o.id, onSelect: () => setBase(o.id) }))
      : tab === "flower"
      ? KRATHONG_FLOWERS.map((o) => ({ ...o, selected: flower === o.id, onSelect: () => setFlower(o.id) }))
      : tab === "candle"
      ? KRATHONG_CANDLES.map((o) => ({ ...o, selected: candle === o.id, onSelect: () => setCandle(o.id) }))
      : KRATHONG_TOPPINGS.map((o) => ({ ...o, selected: topping === o.id, onSelect: () => setTopping(o.id) }));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-3 sm:p-5 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby="builder-title"
    >
      <div className="relative flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-[#c9a461]/40 bg-gradient-to-b from-[#14100c] via-[#0e0b08] to-[#080604] text-[#efe6d5] shadow-[0_28px_80px_rgba(0,0,0,0.9)] ring-1 ring-[#c9a461]/15">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#c9a461]/20 px-6 py-4">
          <div>
            <h2 id="builder-title" className="font-serif text-lg font-semibold text-[#e5c98b] sm:text-xl">
              ประดิษฐ์กระทงอธิษฐาน
            </h2>
            <p className="mt-0.5 text-xs text-[#a3947a]">
              เลือกเครื่องประกอบกระทงและตั้งจิตอธิษฐานก่อนลอยสู่แม่น้ำเจ้าพระยา
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1.5 text-[#a3947a] transition hover:bg-[#c9a461]/15 hover:text-[#f2e2c2]"
            aria-label="ปิดหน้าต่าง"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <form
          onSubmit={handleSubmit}
          className="grid flex-1 gap-5 overflow-y-auto p-5 md:grid-cols-12"
        >
          {/* Left: Dark Water Pedestal Preview */}
          <div className="flex flex-col items-center justify-between rounded-lg border border-[#c9a461]/25 bg-gradient-to-b from-[#16120d] to-[#080706] p-4 md:col-span-5">
            <div className="flex w-full items-center justify-between gap-2">
              <span className="rounded border border-[#c9a461]/30 bg-[#c9a461]/10 px-2.5 py-1 text-[11px] text-[#e5c98b]">
                {candleMeta.subtitle}
              </span>
              <button
                type="button"
                onClick={handleRandomize}
                className="inline-flex items-center gap-1.5 rounded border border-[#c9a461]/25 bg-[#1b1610] px-2.5 py-1 text-xs text-[#d6cbb7] transition hover:border-[#c9a461]/55 hover:text-[#f2e2c2]"
              >
                <Shuffle className="h-3.5 w-3.5 text-[#c9a461]" />
                สุ่มจัดชุด
              </button>
            </div>

            <div
              className={`relative my-4 flex items-center justify-center transition-all duration-500 ${
                launchingAnim ? "translate-y-8 scale-75 opacity-0" : "animate-bob"
              }`}
            >
              <div
                className="pointer-events-none absolute inset-6 rounded-full opacity-20 blur-2xl"
                style={{ backgroundColor: candleMeta.primaryColor }}
              />
              <KrathongSvg
                base={base}
                flower={flower}
                candle={candle}
                topping={topping}
                size={215}
              />
            </div>

            <div className="w-full rounded border border-[#c9a461]/20 bg-[#120e0a] p-3 text-center text-xs">
              <p className="font-medium text-[#c9a461]">นัยมงคล</p>
              <p className="mt-0.5 text-[#d6cbb7]">{candleMeta.meaning}</p>
            </div>
          </div>

          {/* Right: Customization & Wish Form */}
          <div className="flex flex-col gap-4 md:col-span-7">
            {/* Step Tabs */}
            <div className="grid grid-cols-4 gap-1 rounded-lg border border-[#c9a461]/25 bg-[#0a0806] p-1">
              {[
                { key: "base" as const, label: "ฐานกระทง" },
                { key: "flower" as const, label: "ดอกไม้" },
                { key: "candle" as const, label: "สีเทียน" },
                { key: "topping" as const, label: "เครื่องมงคล" },
              ].map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setTab(item.key)}
                  className={`rounded px-2 py-2 text-xs font-medium transition sm:text-sm ${
                    tab === item.key
                      ? "bg-gradient-to-b from-[#dfc185] to-[#ab833e] text-[#171109] shadow"
                      : "text-[#b8aa92] hover:bg-[#c9a461]/10 hover:text-[#f2e2c2]"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {/* Option Cards */}
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {currentOptions.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={opt.onSelect}
                  className={`flex items-start justify-between rounded-lg border p-3 text-left transition ${
                    opt.selected
                      ? "border-[#c9a461] bg-[#c9a461]/15"
                      : "border-[#c9a461]/18 bg-[#15110c] hover:border-[#c9a461]/40 hover:bg-[#1c1610]"
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <span
                      className="mt-1 h-3.5 w-3.5 shrink-0 rounded-full border border-[#e5c98b]/40"
                      style={{
                        background: `linear-gradient(135deg, ${opt.primaryColor}, ${opt.secondaryColor})`,
                      }}
                    />
                    <div>
                      <div className="text-sm font-medium text-[#f2e2c2]">{opt.name}</div>
                      <div className="text-xs text-[#9c8c72]">{opt.subtitle}</div>
                    </div>
                  </div>
                  {opt.selected && <Check className="h-4 w-4 shrink-0 text-[#e5c98b]" />}
                </button>
              ))}
            </div>

            {/* Name & Wish Inputs */}
            <div className="space-y-3 border-t border-[#c9a461]/20 pt-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-[#cbbba0]">
                  นามผู้ลอยกระทง (ไม่บังคับ)
                </label>
                <input
                  type="text"
                  maxLength={50}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="เช่น ต้นข้าว, ครอบครัวสุขสันต์..."
                  className="w-full rounded-lg border border-[#c9a461]/25 bg-[#17120d] px-3.5 py-2.5 text-sm text-[#f2e2c2] placeholder-[#6c5d47] outline-none transition focus:border-[#c9a461]"
                />
              </div>

              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label className="text-xs font-medium text-[#cbbba0]">
                    คำอธิษฐาน *
                  </label>
                  <span className="text-[11px] text-[#8c7b60]">{wish.length}/300</span>
                </div>
                <textarea
                  rows={3}
                  maxLength={300}
                  value={wish}
                  onChange={(e) => {
                    setWish(e.target.value);
                    if (error) setError("");
                  }}
                  placeholder="ตั้งจิตอธิษฐาน ขอขมาพระแม่คงคา หรือขอพรให้ชีวิต..."
                  className="w-full resize-none rounded-lg border border-[#c9a461]/25 bg-[#17120d] px-3.5 py-2.5 text-sm text-[#f2e2c2] placeholder-[#6c5d47] outline-none transition focus:border-[#c9a461]"
                />
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {WISH_TEMPLATES.map((tpl) => (
                    <button
                      key={tpl.label}
                      type="button"
                      onClick={() => {
                        setWish(tpl.wish);
                        setError("");
                      }}
                      className="rounded border border-[#c9a461]/25 bg-[#19140e] px-2.5 py-1 text-[11px] text-[#d8c196] transition hover:border-[#c9a461]/55 hover:bg-[#c9a461]/15"
                    >
                      + {tpl.label}
                    </button>
                  ))}
                </div>
              </div>

              {error && (
                <p className="rounded border border-[#a84242]/40 bg-[#421515]/50 px-3 py-2 text-xs text-[#f0b8b8]">
                  {error}
                </p>
              )}

              <div className="flex justify-end gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-lg border border-[#c9a461]/25 px-4 py-2.5 text-sm font-medium text-[#c2b296] transition hover:bg-[#c9a461]/10"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-lg bg-gradient-to-b from-[#dfc185] to-[#ab833e] px-5 py-2.5 text-sm font-semibold text-[#171109] shadow-lg transition hover:brightness-110 disabled:opacity-60"
                >
                  {submitting ? "กำลังปล่อยกระทง..." : "ปล่อยกระทงลงสู่แม่น้ำ"}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
