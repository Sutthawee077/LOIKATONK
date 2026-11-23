"use client";

import React, { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Check, Copy, Download, Link2, LogOut, Lock, Users, X } from "lucide-react";
import {
  createPrivateRoom,
  getPrivateRoom,
  normalizeRoomCode,
} from "@/lib/firebase";
import type { PrivateRoomInfo } from "@/types/krathong";

interface PrivateRoomModalProps {
  isOpen: boolean;
  activeRoom: PrivateRoomInfo | null;
  onClose: () => void;
  onEnterRoom: (room: PrivateRoomInfo) => void;
  onLeaveRoom: () => void;
}

export function PrivateRoomModal({
  isOpen,
  activeRoom,
  onClose,
  onEnterRoom,
  onLeaveRoom,
}: PrivateRoomModalProps) {
  const [tab, setTab] = useState<"create" | "join">("create");
  const [roomName, setRoomName] = useState("");
  const [creatorName, setCreatorName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [copiedType, setCopiedType] = useState<"code" | "link" | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");

  useEffect(() => {
    if (!isOpen || !activeRoom || typeof window === "undefined") {
      setQrDataUrl("");
      return;
    }

    let cancelled = false;
    const roomUrl = `${window.location.origin}${window.location.pathname}?room=${activeRoom.code}`;
    void QRCode.toDataURL(roomUrl, {
      margin: 1,
      width: 240,
      color: {
        dark: "#171109",
        light: "#f5e7c6",
      },
    })
      .then((url) => {
        if (!cancelled) setQrDataUrl(url);
      })
      .catch(() => {
        if (!cancelled) setQrDataUrl("");
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, activeRoom]);

  if (!isOpen) return null;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = roomName.trim();
    if (!cleanName) {
      setError("กรุณาตั้งชื่อห้องส่วนตัวก่อนครับ");
      return;
    }

    setError("");
    setSubmitting(true);
    try {
      const created = await createPrivateRoom(cleanName, creatorName);
      setSubmitting(false);
      setRoomName("");
      onEnterRoom(created);
    } catch {
      setSubmitting(false);
      setError("ไม่สามารถสร้างห้องส่วนตัวได้ในขณะนี้ กรุณาลองใหม่");
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalized = normalizeRoomCode(joinCode);
    if (!normalized) {
      setError("กรุณากรอกรหัสห้อง 4–12 ตัวอักษรภาษาอังกฤษหรือตัวเลข");
      return;
    }

    setError("");
    setSubmitting(true);
    try {
      const found = await getPrivateRoom(normalized);
      setSubmitting(false);
      if (!found) {
        setError(`ไม่พบห้องรหัส "${normalized}" กรุณาตรวจสอบรหัสอีกครั้ง`);
        return;
      }
      setJoinCode("");
      onEnterRoom(found);
    } catch {
      setSubmitting(false);
      setError("ไม่สามารถเชื่อมต่อเพื่อค้นหาห้องได้ กรุณาลองใหม่");
    }
  };

  const handleCopy = async (type: "code" | "link") => {
    if (!activeRoom) return;
    const text =
      type === "code"
        ? activeRoom.code
        : `${window.location.origin}${window.location.pathname}?room=${activeRoom.code}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedType(type);
      setTimeout(() => setCopiedType(null), 2000);
    } catch {
      // Ignore clipboard failures
    }
  };

  const handleDownloadQr = () => {
    if (!qrDataUrl || !activeRoom) return;
    const link = document.createElement("a");
    link.href = qrDataUrl;
    link.download = `krathong-room-${activeRoom.code}.png`;
    link.click();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby="private-room-title"
    >
      <div className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-xl border border-[#c9a461]/40 bg-gradient-to-b from-[#14100c] to-[#080604] text-[#efe6d5] shadow-2xl ring-1 ring-[#c9a461]/15">
        <div className="flex items-center justify-between border-b border-[#c9a461]/20 px-5 py-4">
          <div className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-[#c9a461]" />
            <h2 id="private-room-title" className="font-serif text-lg font-semibold text-[#e5c98b]">
              {activeRoom ? "ข้อมูลห้องลอยกระทงส่วนตัว" : "ห้องลอยกระทงส่วนตัว"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1.5 text-[#a3947a] hover:bg-[#c9a461]/15 hover:text-[#f2e2c2]"
            aria-label="ปิดหน้าต่าง"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {activeRoom ? (
          <div className="space-y-4 p-5">
            <div className="rounded-lg border border-[#c9a461]/30 bg-[#17120d] p-4 text-center">
              <p className="text-xs text-[#a3947a]">กำลังลอยอยู่ในห้องส่วนตัว</p>
              <h3 className="mt-1 font-serif text-xl font-semibold text-[#f2e2c2]">
                {activeRoom.name}
              </h3>
              <p className="mt-0.5 text-xs text-[#cbbba0]">
                สร้างโดย {activeRoom.createdBy}
              </p>

              {/* QR Code for scanning straight into room */}
              {qrDataUrl && (
                <div className="mt-3.5 flex flex-col items-center">
                  <div className="rounded-lg border border-[#c9a461]/55 bg-[#f5e7c6] p-2 shadow-md">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={qrDataUrl}
                      alt={`QR Code เข้าห้อง ${activeRoom.code}`}
                      width={136}
                      height={136}
                      className="h-[136px] w-[136px]"
                    />
                  </div>
                  <p className="mt-1.5 text-[11px] text-[#c9a461]">
                    สแกน QR Code เพื่อเข้าห้องเดียวกันได้ทันที
                  </p>
                </div>
              )}

              <div className="mt-3 rounded border border-[#c9a461]/35 bg-[#0c0907] px-4 py-2.5">
                <p className="text-[11px] uppercase tracking-widest text-[#9c8966]">
                  รหัสเชิญเข้าห้อง
                </p>
                <p className="mt-0.5 font-mono text-2xl font-bold tracking-[0.28em] text-[#e5c98b]">
                  {activeRoom.code}
                </p>
              </div>
            </div>

            <p className="text-center text-xs text-[#a3947a]">
              กระทง โคมลอย และคำอธิษฐานในห้องนี้จะเห็นได้เฉพาะผู้ที่มีรหัสหรือลิงก์เข้าห้องเท่านั้น
            </p>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => handleCopy("code")}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#c9a461]/30 bg-[#19140e] px-3 py-2.5 text-xs font-medium text-[#e8dec9] transition hover:border-[#c9a461]/60 hover:bg-[#c9a461]/15"
              >
                {copiedType === "code" ? (
                  <>
                    <Check className="h-4 w-4 text-emerald-400" />
                    <span>คัดลอกรหัสแล้ว</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 text-[#c9a461]" />
                    <span>คัดลอกรหัสห้อง</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => handleCopy("link")}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-b from-[#dfc185] to-[#ab833e] px-3 py-2.5 text-xs font-semibold text-[#171109] shadow transition hover:brightness-110"
              >
                {copiedType === "link" ? (
                  <>
                    <Check className="h-4 w-4" />
                    <span>คัดลอกลิงก์แล้ว</span>
                  </>
                ) : (
                  <>
                    <Link2 className="h-4 w-4" />
                    <span>คัดลอกลิงก์ชวนเพื่อน</span>
                  </>
                )}
              </button>
            </div>

            {qrDataUrl && (
              <button
                type="button"
                onClick={handleDownloadQr}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-[#c9a461]/25 bg-[#15110c] px-4 py-2 text-xs font-medium text-[#d6cbb7] transition hover:border-[#c9a461]/55 hover:bg-[#c9a461]/10"
              >
                <Download className="h-3.5 w-3.5 text-[#c9a461]" />
                <span>บันทึกรูป QR Code ของห้อง</span>
              </button>
            )}

            <div className="border-t border-[#c9a461]/20 pt-3">
              <button
                type="button"
                onClick={() => {
                  onLeaveRoom();
                  onClose();
                }}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-[#a84242]/40 bg-[#421515]/35 px-4 py-2.5 text-xs font-medium text-[#f0b8b8] transition hover:bg-[#5e1d1d]/50"
              >
                <LogOut className="h-4 w-4" />
                ออกจากห้องส่วนตัว (กลับสู่ท่าน้ำหลัก)
              </button>
            </div>
          </div>
        ) : (
          <div className="p-5">
            <p className="mb-4 text-xs leading-relaxed text-[#cbbba0]">
              สร้างลำน้ำส่วนตัวสำหรับคนรัก ครอบครัว หรือกลุ่มเพื่อน มีเฉพาะคนที่อยู่ในห้องเดียวกันเท่านั้นที่จะเห็นกระทงและโคมลอยของกันและกัน
            </p>

            <div className="mb-4 grid grid-cols-2 gap-1 rounded-lg border border-[#c9a461]/25 bg-[#0a0806] p-1">
              <button
                type="button"
                onClick={() => {
                  setTab("create");
                  setError("");
                }}
                className={`inline-flex items-center justify-center gap-1.5 rounded py-2 text-xs font-medium transition ${
                  tab === "create"
                    ? "bg-gradient-to-b from-[#dfc185] to-[#ab833e] text-[#171109] shadow"
                    : "text-[#b8aa92] hover:bg-[#c9a461]/10"
                }`}
              >
                <Lock className="h-3.5 w-3.5" />
                สร้างห้องส่วนตัว
              </button>
              <button
                type="button"
                onClick={() => {
                  setTab("join");
                  setError("");
                }}
                className={`inline-flex items-center justify-center gap-1.5 rounded py-2 text-xs font-medium transition ${
                  tab === "join"
                    ? "bg-gradient-to-b from-[#dfc185] to-[#ab833e] text-[#171109] shadow"
                    : "text-[#b8aa92] hover:bg-[#c9a461]/10"
                }`}
              >
                <Users className="h-3.5 w-3.5" />
                เข้าร่วมด้วยรหัส
              </button>
            </div>

            {tab === "create" ? (
              <form onSubmit={handleCreate} className="space-y-3.5">
                <div>
                  <label className="mb-1 block text-xs font-medium text-[#cbbba0]">
                    ชื่อห้องส่วนตัว *
                  </label>
                  <input
                    type="text"
                    maxLength={60}
                    value={roomName}
                    onChange={(e) => {
                      setRoomName(e.target.value);
                      if (error) setError("");
                    }}
                    placeholder="เช่น ลอยกระทงคู่เรา, ห้องครอบครัว..."
                    className="w-full rounded-lg border border-[#c9a461]/25 bg-[#17120d] px-3.5 py-2.5 text-sm text-[#f2e2c2] placeholder-[#6c5d47] outline-none focus:border-[#c9a461]"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-[#cbbba0]">
                    ชื่อผู้สร้างห้อง (ไม่บังคับ)
                  </label>
                  <input
                    type="text"
                    maxLength={50}
                    value={creatorName}
                    onChange={(e) => setCreatorName(e.target.value)}
                    placeholder="เช่น นัท, ครอบครัว..."
                    className="w-full rounded-lg border border-[#c9a461]/25 bg-[#17120d] px-3.5 py-2.5 text-sm text-[#f2e2c2] placeholder-[#6c5d47] outline-none focus:border-[#c9a461]"
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
                    {submitting ? "กำลังสร้างห้อง..." : "สร้างห้องและเข้าทันที"}
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleJoin} className="space-y-3.5">
                <div>
                  <label className="mb-1 block text-xs font-medium text-[#cbbba0]">
                    รหัสห้องส่วนตัว (6 หลัก) *
                  </label>
                  <input
                    type="text"
                    maxLength={12}
                    value={joinCode}
                    onChange={(e) => {
                      setJoinCode(e.target.value.toUpperCase());
                      if (error) setError("");
                    }}
                    placeholder="เช่น A7K9P2"
                    className="w-full rounded-lg border border-[#c9a461]/25 bg-[#17120d] px-3.5 py-2.5 text-center font-mono text-lg font-semibold uppercase tracking-[0.25em] text-[#e5c98b] placeholder-[#594d3b] outline-none focus:border-[#c9a461]"
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
                    {submitting ? "กำลังค้นหาห้อง..." : "เข้าสู่ห้องส่วนตัว"}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
