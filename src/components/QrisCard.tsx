"use client";

import React, { useMemo, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Maximize2, QrCode, X } from "lucide-react";
import { formatRupiah } from "@/lib/format";
import { usePreferences } from "@/components/PreferencesProvider";
import type { StoreSettings } from "@/types/rental";

interface QrisCardProps {
  settings: StoreSettings;
  amount?: number;
  referenceLabel?: string;
}

export function QrisCard({ settings, amount, referenceLabel }: QrisCardProps) {
  const { language } = usePreferences();
  const [zoomOpen, setZoomOpen] = useState(false);

  const payload = useMemo(() => {
    const merchant = (settings.qris_merchant_name || "RENTUS CAMPUS RENTAL").toUpperCase();
    const nmid = settings.qris_nmid || "ID102026000088991";
    const amt = amount && amount > 0 ? String(Math.round(amount)) : "0";
    return `00020101021226580014ID.CO.QRIS.WWW01189360091400000000000215${nmid}520459995303360540${amt.length}${amt}5802ID59${merchant.length.toString().padStart(2, "0")}${merchant}6007JAKARTA6304ABCD`;
  }, [settings.qris_merchant_name, settings.qris_nmid, amount]);

  const isCustomImage =
    settings.qris_mode === "custom_image" && Boolean(settings.qris_image_url);

  return (
    <>
      <div className="rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between gap-2 border-b border-[var(--line)] pb-2.5">
          <div className="flex min-w-0 items-center gap-2">
            <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[var(--blue-soft)] text-[var(--blue)]">
              <QrCode className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <div className="text-xs font-extrabold tracking-wider text-[var(--blue)] uppercase">
                QRIS {isCustomImage ? "Official" : "Dummy / Sandbox"}
              </div>
              <div className="truncate text-sm font-bold text-[var(--ink)]">
                {settings.qris_merchant_name}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setZoomOpen(true)}
            className="inline-flex shrink-0 items-center justify-center gap-1 rounded-lg border border-[var(--line)] bg-[var(--surface-subtle)] px-2.5 py-1.5 text-xs font-semibold leading-none whitespace-nowrap text-[var(--ink)] transition hover:border-[var(--blue)]"
          >
            <Maximize2 className="h-3.5 w-3.5 shrink-0" />
            <span>{language === "id" ? "Perbesar" : "Zoom"}</span>
          </button>
        </div>

        <div className="flex flex-col items-center justify-center rounded-xl bg-white p-3.5 text-slate-900 sm:p-4">
          {isCustomImage && settings.qris_image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={settings.qris_image_url}
              alt={`QRIS ${settings.qris_merchant_name}`}
              className="max-h-64 w-auto rounded-lg object-contain"
            />
          ) : (
            <div className="flex w-full max-w-[216px] flex-col items-center">
              <div className="mb-2 flex w-full items-center justify-between gap-2 text-[10px] font-bold tracking-wide text-slate-500 uppercase sm:text-[11px]">
                <span className="truncate">QRIS STANDAR NASIONAL</span>
                <span className="inline-flex shrink-0 items-center justify-center rounded bg-slate-100 px-1.5 py-0.5 text-[10px] leading-none text-slate-700">
                  DUMMY
                </span>
              </div>
              <QRCodeSVG
                value={payload}
                size={188}
                level="M"
                includeMargin={false}
                bgColor="#ffffff"
                fgColor="#152238"
                className="h-auto max-w-full"
              />
              <div className="mt-2.5 text-center">
                <div className="font-mono-num text-[11px] font-semibold text-slate-600">
                  NMID: {settings.qris_nmid}
                </div>
                {referenceLabel ? (
                  <div className="mt-0.5 text-[11px] text-slate-500">
                    {referenceLabel}
                  </div>
                ) : null}
              </div>
            </div>
          )}
        </div>

        {amount && amount > 0 ? (
          <div className="mt-3 flex items-center justify-between rounded-xl bg-[var(--blue-soft)] px-3.5 py-2 text-sm">
            <span className="font-semibold text-[var(--muted)]">
              {language === "id" ? "Nominal bayar" : "Amount due"}
            </span>
            <strong className="font-mono-num text-base font-extrabold text-[var(--blue)]">
              {formatRupiah(amount)}
            </strong>
          </div>
        ) : null}

        <p className="mt-2.5 text-xs leading-relaxed text-[var(--muted)]">
          {language === "id" ? settings.qris_note_id : settings.qris_note_en}
        </p>
      </div>

      {zoomOpen ? (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs"
          onClick={() => setZoomOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-3xl border border-[var(--line)] bg-[var(--paper)] p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h4 className="text-base font-extrabold text-[var(--ink)]">
                  {settings.qris_merchant_name}
                </h4>
                <p className="font-mono-num text-xs text-[var(--muted)]">
                  NMID: {settings.qris_nmid}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setZoomOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--surface-subtle)] text-[var(--ink)]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex justify-center rounded-2xl bg-white p-5">
              {isCustomImage && settings.qris_image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={settings.qris_image_url}
                  alt="QRIS Zoom"
                  className="max-h-80 w-auto object-contain"
                />
              ) : (
                <QRCodeSVG
                  value={payload}
                  size={256}
                  level="M"
                  bgColor="#ffffff"
                  fgColor="#152238"
                />
              )}
            </div>
            {amount && amount > 0 ? (
              <div className="mt-3 text-center font-mono-num text-lg font-extrabold text-[var(--blue)]">
                {formatRupiah(amount)}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}

