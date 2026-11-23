"use client";

import React, { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { Check, Copy, Download, Share2, X } from "lucide-react";
import {
  KRATHONG_BASES,
  KRATHONG_CANDLES,
  getOptionMeta,
  type KrathongItem,
  type PrivateRoomInfo,
} from "@/types/krathong";
import { KrathongSvg } from "./KrathongSvg";

interface ShareCardModalProps {
  krathong: KrathongItem | null;
  activeRoom?: PrivateRoomInfo | null;
  onClose: () => void;
}

function segmentThaiWords(text: string): string[] {
  if (typeof Intl !== "undefined" && "Segmenter" in Intl) {
    try {
      const segmenter = new Intl.Segmenter("th", { granularity: "word" });
      return Array.from(segmenter.segment(text), (s) => s.segment);
    } catch {
      // Fallback below
    }
  }
  return Array.from(text);
}

function wrapThaiText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  const paragraphs = text.split(/\r?\n/);
  const lines: string[] = [];

  for (const para of paragraphs) {
    const tokens = segmentThaiWords(para);
    let current = "";
    for (const token of tokens) {
      const test = current + token;
      if (ctx.measureText(test).width <= maxWidth) {
        current = test;
      } else {
        if (current.trim()) lines.push(current.trim());
        current = token.trimStart();
      }
    }
    if (current.trim()) lines.push(current.trim());
  }

  return lines.slice(0, 6);
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawCornerDiamond(ctx: CanvasRenderingContext2D, cx: number, cy: number) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.fillStyle = "#c9a461";
  ctx.beginPath();
  ctx.moveTo(0, -10);
  ctx.lineTo(10, 0);
  ctx.lineTo(0, 10);
  ctx.lineTo(-10, 0);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#120e0a";
  ctx.beginPath();
  ctx.moveTo(0, -4.5);
  ctx.lineTo(4.5, 0);
  ctx.lineTo(0, 4.5);
  ctx.lineTo(-4.5, 0);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

export function ShareCardModal({
  krathong,
  activeRoom = null,
  onClose,
}: ShareCardModalProps) {
  const svgHostRef = useRef<HTMLDivElement | null>(null);
  const [previewDataUrl, setPreviewDataUrl] = useState<string>("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!krathong) {
      setPreviewDataUrl("");
      return;
    }

    let cancelled = false;

    const renderPoster = async () => {
      if (document.fonts?.ready) {
        await document.fonts.ready;
      }

      const canvas = document.createElement("canvas");
      canvas.width = 1080;
      canvas.height = 1350;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // 1. Dark Lacquer Base
      ctx.fillStyle = "#080605";
      ctx.fillRect(0, 0, 1080, 1350);

      // 2. Blend Wat Arun night photograph atmospherically (relative path works on subpaths)
      await new Promise<void>((resolve) => {
        const bg = new Image();
        bg.onload = () => {
          ctx.save();
          ctx.globalAlpha = 0.72;
          const targetH = 820;
          const scale = Math.max(1080 / bg.width, targetH / bg.height);
          const dw = bg.width * scale;
          const dh = bg.height * scale;
          ctx.drawImage(bg, (1080 - dw) / 2, 0, dw, dh);
          ctx.restore();
          resolve();
        };
        bg.onerror = () => resolve();
        bg.src = "./wat-arun-night.jpg";
      });

      const fadeGrad = ctx.createLinearGradient(0, 0, 0, 1350);
      fadeGrad.addColorStop(0, "rgba(8, 6, 5, 0.58)");
      fadeGrad.addColorStop(0.28, "rgba(8, 6, 5, 0.12)");
      fadeGrad.addColorStop(0.56, "rgba(10, 8, 6, 0.75)");
      fadeGrad.addColorStop(1, "rgba(8, 6, 5, 0.98)");
      ctx.fillStyle = fadeGrad;
      ctx.fillRect(0, 0, 1080, 1350);

      // 3. Ornate Thai Heritage Double Frame + Corner Diamond Ornaments
      ctx.strokeStyle = "rgba(201, 164, 97, 0.72)";
      ctx.lineWidth = 3;
      drawRoundedRect(ctx, 44, 44, 992, 1262, 18);
      ctx.stroke();

      ctx.strokeStyle = "rgba(229, 201, 139, 0.28)";
      ctx.lineWidth = 1.5;
      drawRoundedRect(ctx, 62, 62, 956, 1226, 12);
      ctx.stroke();

      drawCornerDiamond(ctx, 62, 62);
      drawCornerDiamond(ctx, 1018, 62);
      drawCornerDiamond(ctx, 62, 1288);
      drawCornerDiamond(ctx, 1018, 1288);

      // 4. Masthead Typography
      ctx.textAlign = "center";
      ctx.fillStyle = "#f2e2c2";
      ctx.font = '600 46px "Noto Serif Thai", "Sarabun", serif';
      ctx.fillText("ลอยกระทงริมแม่น้ำเจ้าพระยา", 540, 146);

      ctx.fillStyle = "#c9a461";
      ctx.font = '400 24px "Sarabun", sans-serif';
      const subtitle = activeRoom
        ? `ณ ห้องส่วนตัว "${activeRoom.name}" (${activeRoom.code})  •  วัดอรุณราชวราราม`
        : "ณ ท่าน้ำวัดอรุณราชวราราม  •  คืนเพ็ญเดือนสิบสอง";
      ctx.fillText(subtitle, 540, 196);

      ctx.strokeStyle = "rgba(201, 164, 97, 0.45)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(300, 222);
      ctx.lineTo(780, 222);
      ctx.stroke();

      // 5. Realistic Krathong SVG Snapshot
      const svgEl = svgHostRef.current?.querySelector("svg");
      if (svgEl) {
        try {
          const clone = svgEl.cloneNode(true) as SVGElement;
          clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
          const serialized = new XMLSerializer().serializeToString(clone);
          const svgUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(serialized)}`;

          await new Promise<void>((resolve) => {
            const img = new Image();
            img.onload = () => {
              ctx.drawImage(img, 540 - 245, 290, 490, 445);
              resolve();
            };
            img.onerror = () => resolve();
            img.src = svgUrl;
          });
        } catch {
          // Proceed cleanly if SVG serialization isn't supported
        }
      }

      // 6. Blessing Badge Pill
      const candleMeta = getOptionMeta(KRATHONG_CANDLES, krathong.candle);
      const baseMeta = getOptionMeta(KRATHONG_BASES, krathong.base);
      const badgeText = `${candleMeta.subtitle}  •  ${baseMeta.name}`;
      ctx.font = '500 24px "Sarabun", sans-serif';
      const badgeW = Math.min(840, ctx.measureText(badgeText).width + 68);
      ctx.fillStyle = "rgba(20, 16, 12, 0.88)";
      drawRoundedRect(ctx, 540 - badgeW / 2, 748, badgeW, 52, 8);
      ctx.fill();
      ctx.strokeStyle = "rgba(201, 164, 97, 0.55)";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.fillStyle = "#e5c98b";
      ctx.fillText(badgeText, 540, 782);

      // 7. Wish Panel
      ctx.fillStyle = "rgba(18, 14, 10, 0.86)";
      drawRoundedRect(ctx, 104, 832, 872, 286, 12);
      ctx.fill();
      ctx.strokeStyle = "rgba(201, 164, 97, 0.35)";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.fillStyle = "#f2e8d5";
      ctx.font = '500 32px "Sarabun", sans-serif';
      const lines = wrapThaiText(ctx, `“${krathong.wish}”`, 780);
      const lineHeight = 46;
      const startY = 975 - ((lines.length - 1) * lineHeight) / 2;
      lines.forEach((line, idx) => {
        ctx.fillText(line, 540, startY + idx * lineHeight);
      });

      // 8. Footer: Sender Name & Date on Left, Scannable QR Code on Right
      ctx.textAlign = "left";
      ctx.fillStyle = "#e5c98b";
      ctx.font = '600 32px "Noto Serif Thai", "Sarabun", serif';
      ctx.fillText(`— ${krathong.name} —`, 108, 1188);

      const dateLabel = new Date(krathong.createdAt).toLocaleDateString("th-TH", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      ctx.fillStyle = "#a3947a";
      ctx.font = '400 22px "Sarabun", sans-serif';
      ctx.fillText(`บันทึกคำอธิษฐานเมื่อ ${dateLabel}`, 108, 1234);

      try {
        const baseUrl = `${window.location.origin}${window.location.pathname}`;
        const shareUrl = activeRoom ? `${baseUrl}?room=${activeRoom.code}` : baseUrl;
        const qrDataUrl = await QRCode.toDataURL(shareUrl, {
          margin: 1,
          width: 150,
          color: { dark: "#171109", light: "#f5e7c6" },
        });

        await new Promise<void>((resolve) => {
          const qrImg = new Image();
          qrImg.onload = () => {
            ctx.fillStyle = "#f5e7c6";
            drawRoundedRect(ctx, 854, 1138, 122, 122, 10);
            ctx.fill();
            ctx.strokeStyle = "rgba(201, 164, 97, 0.8)";
            ctx.lineWidth = 2;
            ctx.stroke();

            ctx.drawImage(qrImg, 860, 1144, 110, 110);

            ctx.textAlign = "center";
            ctx.fillStyle = "#c9a461";
            ctx.font = '400 15px "Sarabun", sans-serif';
            ctx.fillText(
              activeRoom ? "สแกนเข้าห้องส่วนตัว" : "สแกนร่วมลอยกระทง",
              915,
              1278
            );
            resolve();
          };
          qrImg.onerror = () => resolve();
          qrImg.src = qrDataUrl;
        });
      } catch {
        // Proceed without QR if generation fails
      }

      if (!cancelled) {
        setPreviewDataUrl(canvas.toDataURL("image/png"));
      }
    };

    void renderPoster();
    return () => {
      cancelled = true;
    };
  }, [krathong, activeRoom]);

  if (!krathong) return null;

  const handleDownload = () => {
    if (!previewDataUrl) return;
    const link = document.createElement("a");
    link.href = previewDataUrl;
    link.download = `loy-krathong-wat-arun-${krathong.id.slice(-6)}.png`;
    link.click();
  };

  const handleShareOrCopy = async () => {
    const baseUrl =
      typeof window !== "undefined"
        ? `${window.location.origin}${window.location.pathname}`
        : "";
    const roomLine = activeRoom
      ? `\nเข้าห้องส่วนตัว "${activeRoom.name}" (${activeRoom.code}): ${baseUrl}?room=${activeRoom.code}`
      : "";
    const shareText = `ลอยกระทงริมแม่น้ำเจ้าพระยา ณ ท่าน้ำวัดอรุณราชวราราม\n"${krathong.wish}"\n— ${krathong.name}${roomLine}`;

    if (typeof navigator !== "undefined" && navigator.share && previewDataUrl) {
      try {
        const res = await fetch(previewDataUrl);
        const blob = await res.blob();
        const file = new File([blob], "loy-krathong-wish.png", { type: "image/png" });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: "บัตรที่ระลึกคำอธิษฐานวันลอยกระทง",
            text: shareText,
            files: [file],
          });
          return;
        }
      } catch {
        // Fallback to clipboard copy
      }
    }

    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Ignore clipboard failures
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby="share-card-title"
    >
      <div ref={svgHostRef} className="pointer-events-none fixed -left-[9999px] top-0 opacity-0">
        <KrathongSvg
          base={krathong.base}
          flower={krathong.flower}
          candle={krathong.candle}
          topping={krathong.topping}
          showWaterReflection={true}
          size={440}
        />
      </div>

      <div className="flex max-h-[92vh] w-full max-w-md flex-col overflow-hidden rounded-xl border border-[#c9a461]/40 bg-gradient-to-b from-[#14100c] to-[#080604] text-[#efe6d5] shadow-2xl ring-1 ring-[#c9a461]/15">
        <div className="flex items-center justify-between border-b border-[#c9a461]/20 px-5 py-4">
          <h2 id="share-card-title" className="font-serif text-base font-semibold text-[#e5c98b] sm:text-lg">
            บัตรที่ระลึกคำอธิษฐาน
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

        <div className="flex-1 overflow-y-auto p-5">
          <div className="flex items-center justify-center overflow-hidden rounded-lg border border-[#c9a461]/25 bg-[#080605]">
            {previewDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewDataUrl}
                alt="บัตรที่ระลึกลอยกระทง ณ วัดอรุณราชวราราม"
                className="max-h-[58vh] w-auto object-contain"
              />
            ) : (
              <div className="flex h-80 items-center justify-center text-sm text-[#a3947a]">
                กำลังจัดทำบัตรที่ระลึก...
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2.5 border-t border-[#c9a461]/20 p-5 sm:flex-row">
          <button
            type="button"
            onClick={handleDownload}
            disabled={!previewDataUrl}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-gradient-to-b from-[#dfc185] to-[#ab833e] px-4 py-2.5 text-sm font-semibold text-[#171109] shadow-lg transition hover:brightness-110 disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            บันทึกรูปภาพ (PNG)
          </button>

          <button
            type="button"
            onClick={handleShareOrCopy}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-[#c9a461]/30 bg-[#17120d] px-4 py-2.5 text-sm font-medium text-[#e8dec9] transition hover:border-[#c9a461]/60 hover:bg-[#c9a461]/15"
          >
            {copied ? (
              <>
                <Check className="h-4 w-4 text-emerald-400" />
                <span>คัดลอกข้อความแล้ว</span>
              </>
            ) : (
              <>
                <Share2 className="h-4 w-4 text-[#c9a461]" />
                <span>แชร์ / คัดลอก</span>
                <Copy className="h-3.5 w-3.5 opacity-60" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
