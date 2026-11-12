"use client";

import React, { useEffect, useState } from "react";
import {
  CalendarPlus,
  CheckCircle2,
  Clock,
  ExternalLink,
  MessageCircle,
  Search,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { usePreferences } from "@/components/PreferencesProvider";
import { QrisCard } from "@/components/QrisCard";
import {
  buildWhatsAppUrl,
  formatDateTime,
  formatRemaining,
  formatRupiah,
} from "@/lib/format";
import { getStatusLabel } from "@/lib/i18n";
import { uploadImageToBucket } from "@/lib/upload";
import type { Booking, GuestBookingToken, StoreSettings } from "@/types/rental";

interface MyRentalsModalProps {
  open: boolean;
  settings: StoreSettings;
  tokens: GuestBookingToken[];
  onClose: () => void;
  onAddToken: (token: GuestBookingToken) => void;
  onRemoveToken: (bookingCode: string) => void;
}

export function MyRentalsModal({
  open,
  settings,
  tokens,
  onClose,
  onAddToken,
  onRemoveToken,
}: MyRentalsModalProps) {
  const { language, t } = usePreferences();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [lookupCode, setLookupCode] = useState("");
  const [lookupContact, setLookupContact] = useState("");
  const [lookupLoading, setLookupLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Extension sub-modal state
  const [extendingBooking, setExtendingBooking] = useState<Booking | null>(null);
  const [extraDays, setExtraDays] = useState(1);
  const [extPaymentMethod, setExtPaymentMethod] = useState("QRIS");
  const [extProofUrl, setExtProofUrl] = useState<string | null>(null);
  const [uploadingExtProof, setUploadingExtProof] = useState(false);
  const [submittingExt, setSubmittingExt] = useState(false);

  // Live 1s countdown ticker
  useEffect(() => {
    if (!open) return;
    const id = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(id);
  }, [open]);

  const fetchBookings = async () => {
    if (!tokens.length) {
      setBookings([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(
        `/api/bookings?tokens=${encodeURIComponent(JSON.stringify(tokens))}`
      );
      const data = await res.json();
      if (res.ok && Array.isArray(data.bookings)) {
        setBookings(data.bookings);
      }
    } catch {
      // Ignore network hiccup
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      if (!tokens.length) {
        setBookings([]);
        return;
      }
      try {
        const res = await fetch(
          `/api/bookings?tokens=${encodeURIComponent(JSON.stringify(tokens))}`
        );
        const data = await res.json();
        if (!cancelled && res.ok && Array.isArray(data.bookings)) {
          setBookings(data.bookings);
        }
      } catch {
        // Ignore network hiccup
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, tokens]);

  if (!open) return null;

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLookupLoading(true);
    setErrorMsg(null);
    setNotice(null);
    try {
      const res = await fetch(
        `/api/bookings?code=${encodeURIComponent(lookupCode.trim())}&contact=${encodeURIComponent(
          lookupContact.trim()
        )}`
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Lookup failed");
      if (!data.booking) {
        setErrorMsg(t.rentalsModal.lookupNotFound);
        return;
      }
      const found = data.booking as Booking;
      onAddToken({
        booking_code: found.booking_code,
        tracking_token: found.tracking_token,
      });
      setBookings((prev) => {
        const filtered = prev.filter((b) => b.booking_code !== found.booking_code);
        return [found, ...filtered];
      });
      setLookupCode("");
      setLookupContact("");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : t.rentalsModal.lookupNotFound);
    } finally {
      setLookupLoading(false);
    }
  };

  const handleProofUpdate = async (
    booking: Booking,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErrorMsg(null);
    setNotice(null);
    try {
      const url = await uploadImageToBucket("payment-proofs", file, "bookings");
      const res = await fetch("/api/bookings/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "attach_proof",
          booking_code: booking.booking_code,
          tracking_token: booking.tracking_token,
          payment_method: booking.payment_method,
          payment_proof_url: url,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to attach proof");
      setNotice(
        language === "id"
          ? "Bukti pembayaran berhasil dikirim untuk verifikasi."
          : "Payment proof uploaded for verification."
      );
      await fetchBookings();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Upload failed");
    }
  };

  const handleConfirmReturn = async (booking: Booking) => {
    setErrorMsg(null);
    setNotice(null);
    try {
      const res = await fetch("/api/bookings/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "confirm_return",
          booking_code: booking.booking_code,
          tracking_token: booking.tracking_token,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Action failed");
      setNotice(
        language === "id"
          ? "Konfirmasi pengembalian dicatat! Terima kasih."
          : "Return confirmation recorded! Thank you."
      );
      await fetchBookings();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to confirm return");
    }
  };

  const handleExtensionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!extendingBooking) return;
    setSubmittingExt(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/bookings/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "request_extension",
          booking_code: extendingBooking.booking_code,
          tracking_token: extendingBooking.tracking_token,
          extra_days: extraDays,
          payment_method: extPaymentMethod,
          payment_proof_url: extProofUrl,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Extension failed");
      setExtendingBooking(null);
      setExtProofUrl(null);
      setExtraDays(1);
      setNotice(
        language === "id"
          ? "Pengajuan perpanjangan sewa terkirim! Menunggu konfirmasi pemilik/admin."
          : "Extension request sent! Waiting for owner/admin confirmation."
      );
      await fetchBookings();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Extension request failed");
    } finally {
      setSubmittingExt(false);
    }
  };

  const extSubtotal = extendingBooking
    ? extendingBooking.price_per_day * extendingBooking.quantity * extraDays
    : 0;
  const extFee = Math.round(extSubtotal * (Number(settings.service_fee_pct || 5) / 100));
  const extTotal = extSubtotal + extFee;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 p-3 backdrop-blur-xs sm:p-5"
      onClick={onClose}
    >
      <div
        className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-[var(--line)] bg-[var(--paper)] p-5 shadow-2xl sm:p-7"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-start justify-between gap-4 border-b border-[var(--line)] pb-4">
          <div>
            <h2 className="flex items-center gap-2 text-xl font-extrabold text-[var(--ink)] sm:text-2xl">
              <Clock className="h-5 w-5 text-[var(--blue)]" />
              {t.rentalsModal.title}
            </h2>
            <p className="mt-1 text-xs text-[var(--muted)] sm:text-sm">
              {t.rentalsModal.subtitle}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--surface-subtle)] text-[var(--muted)] hover:text-[var(--ink)]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Cross-device Booking Lookup */}
        <form
          onSubmit={handleLookup}
          className="mb-5 rounded-2xl border border-[var(--line)] bg-[var(--surface-subtle)] p-4"
        >
          <div className="mb-2.5 text-xs font-extrabold tracking-wide text-[var(--ink)] uppercase">
            {t.rentalsModal.lookupTitle}
          </div>
          <div className="grid gap-2.5 sm:grid-cols-12">
            <input
              required
              value={lookupCode}
              onChange={(e) => setLookupCode(e.target.value)}
              placeholder={t.rentalsModal.lookupCodePh}
              className="font-mono-num min-w-0 rounded-xl border border-[var(--line)] bg-[var(--paper)] px-3 py-2 text-sm uppercase placeholder:font-sans placeholder:normal-case text-[var(--ink)] outline-none focus:border-[var(--blue)] sm:col-span-5"
            />
            <input
              required
              value={lookupContact}
              onChange={(e) => setLookupContact(e.target.value)}
              placeholder={t.rentalsModal.lookupContactPh}
              className="min-w-0 rounded-xl border border-[var(--line)] bg-[var(--paper)] px-3 py-2 text-sm text-[var(--ink)] outline-none focus:border-[var(--blue)] sm:col-span-4"
            />
            <button
              type="submit"
              disabled={lookupLoading}
              className="inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-xl bg-[var(--blue)] px-3 py-2 text-xs font-extrabold leading-none whitespace-nowrap text-white hover:bg-[var(--blue-dark)] disabled:opacity-50 sm:col-span-3"
            >
              <Search className="h-3.5 w-3.5 shrink-0" />
              <span>{lookupLoading ? "..." : t.rentalsModal.lookupBtn}</span>
            </button>
          </div>
        </form>

        {notice ? (
          <div className="mb-4 rounded-xl bg-[var(--success-bg)] px-4 py-3 text-xs font-bold text-[var(--success-ink)]">
            {notice}
          </div>
        ) : null}

        {errorMsg ? (
          <div className="mb-4 rounded-xl bg-[var(--danger-bg)] px-4 py-3 text-xs font-bold text-[var(--danger-ink)]">
            {errorMsg}
          </div>
        ) : null}

        {/* Extension Sub-Form */}
        {extendingBooking ? (
          <form
            onSubmit={handleExtensionSubmit}
            className="mb-5 space-y-4 rounded-2xl border-2 border-[var(--blue)] bg-[var(--surface-subtle)] p-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold text-[var(--ink)]">
                {t.rentalsModal.extensionTitle} — {extendingBooking.booking_code}
              </h3>
              <button
                type="button"
                onClick={() => setExtendingBooking(null)}
                className="text-xs font-bold text-[var(--muted)] hover:text-[var(--ink)]"
              >
                {language === "id" ? "Batal" : "Cancel"}
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-bold text-[var(--ink)]">
                  {t.rentalsModal.extraDays}
                </label>
                <select
                  value={extraDays}
                  onChange={(e) => setExtraDays(Number(e.target.value))}
                  className="w-full rounded-xl border border-[var(--line)] bg-[var(--paper)] px-3 py-2.5 text-sm font-semibold text-[var(--ink)]"
                >
                  {[1, 2, 3, 4, 5, 7].map((d) => (
                    <option key={d} value={d}>
                      +{d} {t.catalog.days}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-[var(--ink)]">
                  {t.bookingModal.paymentMethod.replace(" *", "")}
                </label>
                <select
                  value={extPaymentMethod}
                  onChange={(e) => setExtPaymentMethod(e.target.value)}
                  className="w-full rounded-xl border border-[var(--line)] bg-[var(--paper)] px-3 py-2.5 text-sm font-semibold text-[var(--ink)]"
                >
                  {(settings.bank_accounts || [{ code: "QRIS", label: "QRIS" }]).map((opt) => (
                    <option key={opt.code} value={opt.code}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {extPaymentMethod === "QRIS" ? (
              <QrisCard
                settings={settings}
                amount={extTotal}
                referenceLabel={`Ext ${extendingBooking.booking_code}`}
              />
            ) : null}

            <div>
              <label className="mb-1 block text-xs font-bold text-[var(--ink)]">
                {t.bookingModal.proofLabel}
              </label>
              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--blue)]/50 bg-[var(--paper)] px-3 py-2.5 text-xs font-bold text-[var(--blue)]">
                <Upload className="h-4 w-4" />
                <span>
                  {uploadingExtProof
                    ? "Uploading..."
                    : extProofUrl
                    ? "Uploaded ✓"
                    : language === "id"
                    ? "Unggah bukti bayar perpanjangan"
                    : "Upload extension payment receipt"}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setUploadingExtProof(true);
                    try {
                      const url = await uploadImageToBucket("payment-proofs", file, "extensions");
                      setExtProofUrl(url);
                    } catch (err) {
                      setErrorMsg(err instanceof Error ? err.message : "Upload failed");
                    } finally {
                      setUploadingExtProof(false);
                    }
                  }}
                  className="hidden"
                />
              </label>
            </div>

            <button
              type="submit"
              disabled={submittingExt || uploadingExtProof}
              className="w-full rounded-xl bg-[var(--blue)] px-4 py-3 text-sm font-extrabold text-white hover:bg-[var(--blue-dark)] disabled:opacity-50"
            >
              {submittingExt ? "..." : `${t.rentalsModal.submitExtension} (${formatRupiah(extTotal)})`}
            </button>
          </form>
        ) : null}

        {/* Saved Bookings List */}
        {loading ? (
          <div className="py-10 text-center text-sm text-[var(--muted)]">Loading...</div>
        ) : bookings.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[var(--line)] p-8 text-center">
            <div className="text-base font-extrabold text-[var(--ink)]">
              {t.rentalsModal.emptyTitle}
            </div>
            <p className="mt-1 text-xs text-[var(--muted)]">{t.rentalsModal.emptyCopy}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {bookings.map((b) => {
              const title = language === "id" && b.item_name_id ? b.item_name_id : b.item_name;
              const rem = formatRemaining(b.due_at, language, nowMs);
              const pendingExt = b.extensions?.find((ex) => ex.status === "pending");
              const isClosed = b.status === "returned" || b.status === "cancelled";

              return (
                    <article
                      key={b.id}
                      className="rounded-2xl border border-[var(--line)] bg-[var(--surface-subtle)]/70 p-4"
                    >
                      <div className="flex items-start justify-between gap-3 border-b border-[var(--line)] pb-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="font-mono-num inline-flex items-center justify-center rounded-lg bg-[var(--blue-soft)] px-2.5 py-1 text-xs font-extrabold leading-none text-[var(--blue)]">
                              {b.booking_code}
                            </span>
                            <span className="inline-flex items-center justify-center rounded-full bg-[var(--warn-bg)] px-2.5 py-1 text-[11px] font-bold leading-none whitespace-nowrap text-[var(--warn-ink)]">
                              {getStatusLabel(b.status, language)}
                            </span>
                            <span className="inline-flex items-center justify-center rounded-full bg-[var(--paper)] px-2.5 py-1 text-[11px] font-bold leading-none whitespace-nowrap text-[var(--ink)]">
                              {t.rentalsModal.paymentStatus}: {getStatusLabel(b.payment_status, language)}
                            </span>
                          </div>
                          <h3 className="mt-2 break-words text-base font-extrabold text-[var(--ink)]">
                            {title}{" "}
                            <span className="font-mono-num text-sm font-bold text-[var(--muted)]">
                              ({b.quantity}x · {b.days} {t.catalog.days})
                            </span>
                          </h3>
                        </div>

                        <button
                          type="button"
                          onClick={() => onRemoveToken(b.booking_code)}
                          title={t.rentalsModal.removeLocal}
                          aria-label={t.rentalsModal.removeLocal}
                          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[var(--muted)] hover:bg-[var(--paper)] hover:text-rose-500"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      <div className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
                        <div className="flex flex-col gap-0.5 rounded-xl bg-[var(--paper)] px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
                          <span className="shrink-0 text-[var(--muted)]">{t.rentalsModal.period}</span>
                          <strong className="font-mono-num text-[var(--ink)] sm:text-right">
                            {formatDateTime(b.start_at, language)} → {formatDateTime(b.due_at, language)}
                          </strong>
                        </div>
                        <div className="flex items-center justify-between gap-2 rounded-xl bg-[var(--paper)] px-3 py-2">
                          <span className="shrink-0 text-[var(--muted)]">{t.rentalsModal.totalPaid}</span>
                          <strong className="font-mono-num text-right text-[var(--blue)]">
                            {formatRupiah(b.total_amount)} ({b.payment_method})
                          </strong>
                        </div>
                      </div>

                      {!isClosed ? (
                        <div
                          className={`mt-3 rounded-xl px-3.5 py-2.5 text-xs font-extrabold ${
                            rem.overdue
                              ? "bg-[var(--danger-bg)] text-[var(--danger-ink)]"
                              : "bg-[var(--blue-soft)] text-[var(--blue)]"
                          }`}
                        >
                          <span className="font-mono-num">⏱ {rem.label}</span>
                        </div>
                      ) : b.status === "returned" ? (
                        <div className="mt-3 flex items-center gap-2 rounded-xl bg-[var(--success-bg)] px-3.5 py-2.5 text-xs font-bold text-[var(--success-ink)]">
                          <CheckCircle2 className="h-4 w-4 shrink-0" />
                          <span>
                            {language === "id"
                              ? "Pengembalian barang telah selesai dikonfirmasi."
                              : "Item return confirmed and completed."}
                          </span>
                        </div>
                      ) : null}

                      {pendingExt ? (
                        <div className="mt-2.5 rounded-xl border border-amber-400/40 bg-[var(--warn-bg)] px-3 py-2 text-xs font-bold text-[var(--warn-ink)]">
                          +{pendingExt.extra_days} {t.catalog.days} — {t.rentalsModal.extensionPending}
                        </div>
                      ) : null}

                      {/* Action Buttons */}
                      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                        {!isClosed && b.payment_status !== "paid" ? (
                          <label className="inline-flex min-h-[38px] w-full cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-[var(--blue)]/40 bg-[var(--paper)] px-3 py-2 text-xs font-bold leading-none whitespace-nowrap text-[var(--blue)] hover:bg-[var(--blue-soft)] sm:w-auto">
                            <Upload className="h-3.5 w-3.5 shrink-0" />
                            <span>{t.rentalsModal.uploadProofBtn}</span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => handleProofUpdate(b, e)}
                              className="hidden"
                            />
                          </label>
                        ) : null}

                        {!isClosed && !b.return_confirmed_by_renter ? (
                          <button
                            type="button"
                            onClick={() => handleConfirmReturn(b)}
                            className="inline-flex min-h-[38px] w-full items-center justify-center gap-1.5 rounded-xl bg-[var(--yellow-soft)] px-3 py-2 text-xs font-extrabold leading-none whitespace-nowrap text-[var(--warn-ink)] hover:opacity-90 sm:w-auto"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                            <span>{t.rentalsModal.confirmReturnBtn}</span>
                          </button>
                        ) : null}

                        {!isClosed && !pendingExt ? (
                          <button
                            type="button"
                            onClick={() => setExtendingBooking(b)}
                            className="inline-flex min-h-[38px] w-full items-center justify-center gap-1.5 rounded-xl bg-[var(--blue)] px-3 py-2 text-xs font-extrabold leading-none whitespace-nowrap text-white hover:bg-[var(--blue-dark)] sm:w-auto"
                          >
                            <CalendarPlus className="h-3.5 w-3.5 shrink-0" />
                            <span>{t.rentalsModal.extendBtn}</span>
                          </button>
                        ) : null}

                        <a
                          href={buildWhatsAppUrl(
                            settings.admin_whatsapp,
                            language === "id"
                              ? `Halo ${settings.admin_display_name}, saya ingin menanyakan pesanan ${b.booking_code} (${title}).`
                              : `Hi ${settings.admin_display_name}, I have an inquiry regarding booking ${b.booking_code} (${title}).`
                          )}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex min-h-[38px] w-full items-center justify-center gap-1.5 rounded-xl bg-emerald-600/15 px-3 py-2 text-xs font-bold leading-none whitespace-nowrap text-emerald-700 hover:bg-emerald-600/25 sm:w-auto dark:text-emerald-300"
                        >
                          <MessageCircle className="h-3.5 w-3.5 shrink-0" />
                          <span>{t.rentalsModal.chatAdminBtn}</span>
                          <ExternalLink className="h-3 w-3 shrink-0" />
                        </a>
                      </div>
                    </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
