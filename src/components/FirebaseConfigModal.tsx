"use client";

import React, { useState } from "react";
import { Database, CheckCircle2, WifiOff, X, Trash2 } from "lucide-react";
import {
  clearCustomFirebaseConfig,
  getActiveFirebaseConfig,
  saveCustomFirebaseConfig,
  type ConnectionMode,
} from "@/lib/firebase";

interface FirebaseConfigModalProps {
  isOpen: boolean;
  mode: ConnectionMode;
  errorMsg?: string;
  onClose: () => void;
  onConfigChanged: () => void;
}

export function FirebaseConfigModal({
  isOpen,
  mode,
  errorMsg,
  onClose,
  onConfigChanged,
}: FirebaseConfigModalProps) {
  const [rawInput, setRawInput] = useState("");
  const [feedback, setFeedback] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const { config, source } = getActiveFirebaseConfig();

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);

    try {
      const parsed = await saveCustomFirebaseConfig(rawInput);
      setFeedback({
        type: "ok",
        text: `เชื่อมต่อโปรเจกต์ "${parsed.projectId}" สำเร็จแล้ว`,
      });
      setRawInput("");
      onConfigChanged();
    } catch (err) {
      setFeedback({
        type: "err",
        text: err instanceof Error ? err.message : "รูปแบบ Config ไม่ถูกต้อง",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleClear = async () => {
    await clearCustomFirebaseConfig();
    setFeedback({
      type: "ok",
      text: "สลับกลับเป็นโหมดในเครื่องเรียบร้อยแล้ว",
    });
    onConfigChanged();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby="firebase-modal-title"
    >
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-[#c9a461]/40 bg-gradient-to-b from-[#14100c] to-[#080604] text-[#efe6d5] shadow-2xl ring-1 ring-[#c9a461]/15">
        <div className="flex items-center justify-between border-b border-[#c9a461]/20 px-5 py-4">
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4 text-[#c9a461]" />
            <h2 id="firebase-modal-title" className="font-serif text-base font-semibold text-[#e5c98b] sm:text-lg">
              ตั้งค่าฐานข้อมูล Firebase Firestore
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

        <div className="space-y-4 overflow-y-auto p-5 text-sm">
          <div
            className={`rounded-lg border p-4 ${
              mode === "firebase"
                ? "border-emerald-700/50 bg-emerald-950/35"
                : "border-[#c9a461]/30 bg-[#17120d]"
            }`}
          >
            <div className="flex items-center gap-2.5 font-medium">
              {mode === "firebase" ? (
                <>
                  <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                  <span className="text-emerald-200">
                    ออนไลน์เรียลไทม์ผ่าน Firebase Firestore
                  </span>
                </>
              ) : (
                <>
                  <WifiOff className="h-5 w-5 text-[#c9a461]" />
                  <span className="text-[#e5c98b]">
                    โหมดจำลองในเครื่อง (LocalStorage + Multi-Tab)
                  </span>
                </>
              )}
            </div>
            {config && (
              <p className="mt-1.5 text-xs text-[#cbbba0]">
                Project ID: <code className="text-[#f2e2c2]">{config.projectId}</code>{" "}
                ({source === "browser" ? "ตั้งค่าผ่านหน้าเว็บ" : "ตั้งค่าจาก .env.local"})
              </p>
            )}
            {errorMsg && (
              <p className="mt-2 rounded bg-[#421515]/50 px-2.5 py-1.5 text-xs text-[#f0b8b8]">
                หมายเหตุการเชื่อมต่อ: {errorMsg}
              </p>
            )}
          </div>

          <form onSubmit={handleSave} className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-[#cbbba0]">
                วาง Firebase Config (JSON หรือโค้ดจาก Firebase Console) เพื่อเชื่อมต่อทันที
              </label>
              <textarea
                rows={5}
                value={rawInput}
                onChange={(e) => setRawInput(e.target.value)}
                placeholder={`{\n  "apiKey": "AIzaSy...",\n  "authDomain": "your-app.firebaseapp.com",\n  "projectId": "your-app-id",\n  "appId": "1:12345:web:abcde"\n}`}
                className="w-full rounded-lg border border-[#c9a461]/25 bg-[#0b0907] p-3 font-mono text-xs text-[#e5c98b] placeholder-[#594d3b] outline-none focus:border-[#c9a461]"
              />
            </div>

            {feedback && (
              <p
                className={`rounded px-3 py-2 text-xs ${
                  feedback.type === "ok"
                    ? "bg-emerald-950/50 text-emerald-200"
                    : "bg-[#421515]/50 text-[#f0b8b8]"
                }`}
              >
                {feedback.text}
              </p>
            )}

            <div className="flex flex-wrap items-center justify-between gap-2">
              {source === "browser" ? (
                <button
                  type="button"
                  onClick={handleClear}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[#a84242]/40 bg-[#421515]/40 px-3 py-2 text-xs font-medium text-[#f0b8b8] hover:bg-[#5e1d1d]/50"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  ล้างค่าที่บันทึกในเบราว์เซอร์
                </button>
              ) : (
                <span />
              )}

              <button
                type="submit"
                disabled={saving || !rawInput.trim()}
                className="rounded-lg bg-gradient-to-b from-[#dfc185] to-[#ab833e] px-4 py-2 text-xs font-semibold text-[#171109] shadow-md transition hover:brightness-110 disabled:opacity-50"
              >
                {saving ? "กำลังบันทึก..." : "เชื่อมต่อ Firebase ทันที"}
              </button>
            </div>
          </form>

          <div className="space-y-1.5 rounded-lg border border-[#c9a461]/20 bg-[#14100b] p-3.5 text-xs text-[#b8aa92]">
            <p className="font-medium text-[#e5c98b]">หรือตั้งค่าถาวรด้วยไฟล์ .env.local</p>
            <p>
              1. คัดลอก <code className="text-[#f2e2c2]">.env.local.example</code> เป็น{" "}
              <code className="text-[#f2e2c2]">.env.local</code> แล้วใส่ค่า Firebase Web App ของคุณ
            </p>
            <p>
              2. นำกฎความปลอดภัยจาก <code className="text-[#f2e2c2]">firestore.rules</code>{" "}
              ไปใช้งานบน Cloud Firestore
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
