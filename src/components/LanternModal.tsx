"use client";

import React, { useState } from "react";
import { X } from "lucide-react";
import {
  LANTERN_COLORS,
  type CreateLanternInput,
  type LanternColorId,
} from "@/types/krathong";
import { SkyLanternSvg } from "./SkyLanternSvg";

interface LanternModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRelease: (input: CreateLanternInput) => Promise<void>;
}

export function LanternModal({ isOpen, onClose, onRelease }: LanternModalProps) {
  const [name, setName] = useState("");
  const [wish, setWish] = useState("");
  const [color, setColor] = useState<LanternColorId>("gold");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanWish = wish.trim();
    if (!cleanWish) {
      setError("กรุณาเขียนคำอธิษฐานบนโคมลอยก่อนปล่อยนะครับ");
      return;
    }

    setError("");
    setSubmitting(true);
    try {
      await onRelease({
        name: name.trim() || "ผู้ส่งคำอธิษฐาน",
        wish: cleanWish,
        color,
      });
      setSubmitting(false);
      setWish("");
      onClose();
    } catch {
      setSubmitting(false);
      setError("ไม่สามารถปล่อยโคมลอยได้ในขณะนี้ กรุณาลองใหม่");
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby="lantern-modal-title"
    >
      <div className="w-full max-w-md overflow-hidden rounded-xl border border-[#c9a461]/40 bg-gradient-to-b from-[#14100c] to-[#080604] text-[#efe6d5] shadow-2xl ring-1 ring-[#c9a461]/15">
        <div className="flex items-center justify-between border-b border-[#c9a461]/20 px-5 py-4">
          <h2 id="lantern-modal-title" className="font-serif text-lg font-semibold text-[#e5c98b]">
            ปล่อยโคมลอยขึ้นสู่ฟากฟ้า
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1.5 text-[#a3947a] hover:bg-[#c9a461]/15 hover:text-[#f2e2c2]"
            aria-label="ปิดหน้าต่าง"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-5">
          <div className="flex flex-col items-center justify-center rounded-lg border border-[#c9a461]/20 bg-[#0b0907] py-4">
            <div className="animate-bob">
              <SkyLanternSvg color={color} size={84} />
            </div>
            <p className="mt-1 text-xs text-[#cbbba0]">
              {LANTERN_COLORS.find((c) => c.id === color)?.meaning}
            </p>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-[#cbbba0]">
              เลือกสีกระดาษสาโคมลอย
            </label>
            <div className="grid grid-cols-2 gap-2">
              {LANTERN_COLORS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setColor(item.id)}
                  className={`flex items-center gap-2 rounded-lg border p-2.5 text-left text-xs transition ${
                    color === item.id
                      ? "border-[#c9a461] bg-[#c9a461]/15 text-[#f2e2c2]"
                      : "border-[#c9a461]/20 bg-[#15110c] text-[#cbbba0] hover:bg-[#1c1610]"
                  }`}
                >
                  <span
                    className="h-3.5 w-3.5 shrink-0 rounded-full border border-white/20"
                    style={{ backgroundColor: item.primaryColor }}
                  />
                  <span className="truncate font-medium">{item.name}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-[#cbbba0]">
              นามผู้ปล่อยโคม
            </label>
            <input
              type="text"
              maxLength={50}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="เช่น ใบเตย, คนเชียงใหม่..."
              className="w-full rounded-lg border border-[#c9a461]/25 bg-[#17120d] px-3.5 py-2 text-sm text-[#f2e2c2] placeholder-[#6c5d47] outline-none focus:border-[#c9a461]"
            />
          </div>

          <div>
            <div className="mb-1 flex justify-between text-xs">
              <label className="font-medium text-[#cbbba0]">คำอธิษฐานขึ้นสู่ฟากฟ้า *</label>
              <span className="text-[#8c7b60]">{wish.length}/160</span>
            </div>
            <textarea
              rows={2}
              maxLength={160}
              value={wish}
              onChange={(e) => {
                setWish(e.target.value);
                if (error) setError("");
              }}
              placeholder="ขอให้ความฝันสว่างไสว..."
              className="w-full resize-none rounded-lg border border-[#c9a461]/25 bg-[#17120d] px-3.5 py-2 text-sm text-[#f2e2c2] placeholder-[#6c5d47] outline-none focus:border-[#c9a461]"
            />
          </div>

          {error && (
            <p className="rounded border border-[#a84242]/40 bg-[#421515]/50 px-3 py-2 text-xs text-[#f0b8b8]">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-[#c9a461]/25 px-4 py-2 text-sm text-[#c2b296] hover:bg-[#c9a461]/10"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-gradient-to-b from-[#dfc185] to-[#ab833e] px-5 py-2 text-sm font-semibold text-[#171109] shadow-lg transition hover:brightness-110 disabled:opacity-60"
            >
              {submitting ? "กำลังจุดโคม..." : "ปล่อยโคมขึ้นฟ้า"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
