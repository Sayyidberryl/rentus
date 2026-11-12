"use client";

import React, { useMemo, useState } from "react";
import {
  CheckCircle2,
  Copy,
  ExternalLink,
  MapPin,
  MessageCircle,
  Shield,
  Upload,
  User,
  X,
} from "lucide-react";
import { usePreferences } from "@/components/PreferencesProvider";
import { QrisCard } from "@/components/QrisCard";
import { buildWhatsAppUrl, formatRupiah } from "@/lib/format";
import { uploadImageToBucket } from "@/lib/upload";
import type { Booking, RentalItem, StoreSettings } from "@/types/rental";

interface ItemBookingModalProps {
  item: RentalItem | null;
  settings: StoreSettings;
  onClose: () => void;
  onBookingCreated: (booking: Booking) => void;
  onOpenMyRentals: () => void;
}

export function ItemBookingModal({
  item,
  settings,
  onClose,
  onBookingCreated,
  onOpenMyRentals,
}: ItemBookingModalProps) {
  const { language, t } = usePreferences();

  const [renterName, setRenterName] = useState("");
  const [renterPhone, setRenterPhone] = useState("");
  const [renterEmail, setRenterEmail] = useState("");
  const [idType, setIdType] = useState<"KTM" | "KTP" | "SIM" | "PASSPORT">("KTM");
  const [idNumber, setIdNumber] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [days, setDays] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState("QRIS");
  const [paymentReference, setPaymentReference] = useState("");
  const [proofUrl, setProofUrl] = useState<string | null>(null);
  const [uploadingProof, setUploadingProof] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [createdBooking, setCreatedBooking] = useState<Booking | null>(null);
  const [copied, setCopied] = useState(false);

  const selectedAccount = useMemo(() => {
    return settings.bank_accounts?.find((b) => b.code === paymentMethod) || null;
  }, [settings.bank_accounts, paymentMethod]);

  if (!item) return null;

  const displayName = language === "id" && item.name_id ? item.name_id : item.name;
  const displayDesc =
    language === "id" && item.description_id ? item.description_id : item.description;
  const displayCondition =
    language === "id" && item.condition_id ? item.condition_id : item.condition;

  const subtotal = item.price_per_day * days * quantity;
  const serviceFee = Math.round(subtotal * (Number(settings.service_fee_pct || 5) / 100));
  const depositTotal = item.deposit_amount * quantity;
  const totalPayable = subtotal + serviceFee + depositTotal;

  const handleProofUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingProof(true);
    setErrorMsg(null);
    try {
      const url = await uploadImageToBucket("payment-proofs", file, "bookings");
      setProofUrl(url);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploadingProof(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          item_id: item.id,
          days,
          quantity,
          renter_name: renterName,
          renter_phone: renterPhone,
          renter_email: renterEmail,
          renter_identity_type: idType,
          renter_identity_number: idNumber,
          renter_address: address,
          renter_notes: notes,
          payment_method: paymentMethod,
          payment_proof_url: proofUrl,
          payment_reference: paymentReference || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Booking failed");
      }
      setCreatedBooking(data.booking);
      onBookingCreated(data.booking);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Booking failed");
    } finally {
      setSubmitting(false);
    }
  };

  const copyCode = async () => {
    if (!createdBooking) return;
    try {
      await navigator.clipboard.writeText(createdBooking.booking_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Ignore clipboard failure
    }
  };

  const inquiryWaUrl = buildWhatsAppUrl(
    settings.admin_whatsapp,
    language === "id"
      ? `Halo ${settings.admin_display_name}, saya ingin bertanya tentang sewa "${displayName}" (${formatRupiah(item.price_per_day)}/hari) di ${settings.store_name}.`
      : `Hi ${settings.admin_display_name}, I have a question about renting "${displayName}" (${formatRupiah(item.price_per_day)}/day) at ${settings.store_name}.`
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 p-3 backdrop-blur-xs sm:p-5"
      onClick={onClose}
    >
      <div
        className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-3xl border border-[var(--line)] bg-[var(--paper)] p-5 shadow-2xl sm:p-7"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="mb-5 flex items-start justify-between gap-3 border-b border-[var(--line)] pb-4">
          <div className="min-w-0">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--blue-soft)] px-2.5 py-1 text-[11px] font-extrabold leading-none tracking-wide text-[var(--blue)] uppercase">
              {item.category} · {displayCondition}
            </span>
            <h2 className="mt-2 break-words text-xl font-extrabold text-[var(--ink)] sm:text-2xl">
              {createdBooking ? t.bookingModal.successTitle : displayName}
            </h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              {createdBooking ? t.bookingModal.successCopy : t.bookingModal.subtitle}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--surface-subtle)] leading-none text-[var(--muted)] transition hover:text-[var(--ink)]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Success Receipt Screen */}
        {createdBooking ? (
          <div className="space-y-5">
            <div className="rounded-2xl border border-emerald-500/30 bg-[var(--success-bg)] p-4 text-[var(--success-ink)] sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <CheckCircle2 className="h-8 w-8 shrink-0" />
                  <div className="min-w-0">
                    <div className="text-xs font-bold uppercase opacity-80">
                      {t.bookingModal.bookingCodeLabel}
                    </div>
                    <div className="font-mono-num truncate text-xl font-extrabold tracking-wider sm:text-2xl">
                      {createdBooking.booking_code}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={copyCode}
                  className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl bg-white/80 px-3.5 py-2 text-xs font-extrabold leading-none whitespace-nowrap text-slate-900 shadow-xs transition hover:bg-white"
                >
                  <Copy className="h-3.5 w-3.5 shrink-0" />
                  <span>{copied ? t.bookingModal.copied : t.bookingModal.copyCode}</span>
                </button>
              </div>
            </div>

            <div className="grid gap-4 rounded-2xl border border-[var(--line)] bg-[var(--surface-subtle)] p-4 sm:grid-cols-2">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between gap-2">
                  <span className="shrink-0 text-[var(--muted)]">{t.bookingModal.fullName.replace(" *", "")}</span>
                  <strong className="min-w-0 break-words text-right text-[var(--ink)]">{createdBooking.renter_name}</strong>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="shrink-0 text-[var(--muted)]">WhatsApp</span>
                  <strong className="font-mono-num min-w-0 break-all text-right text-[var(--ink)]">{createdBooking.renter_phone}</strong>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="shrink-0 text-[var(--muted)]">{createdBooking.renter_identity_type}</span>
                  <strong className="font-mono-num min-w-0 break-all text-right text-[var(--ink)]">
                    {createdBooking.renter_identity_number}
                  </strong>
                </div>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between gap-2">
                  <span className="shrink-0 text-[var(--muted)]">{t.bookingModal.duration.replace(" *", "")}</span>
                  <strong className="font-mono-num text-right text-[var(--ink)]">
                    {createdBooking.quantity}x · {createdBooking.days} {t.catalog.days}
                  </strong>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="shrink-0 text-[var(--muted)]">{t.bookingModal.paymentMethod.replace(" *", "")}</span>
                  <strong className="text-right text-[var(--ink)]">{createdBooking.payment_method}</strong>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="shrink-0 text-[var(--muted)]">{t.bookingModal.totalPayable}</span>
                  <strong className="font-mono-num text-right text-[var(--blue)]">
                    {formatRupiah(createdBooking.total_amount)}
                  </strong>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <a
                href={buildWhatsAppUrl(
                  settings.admin_whatsapp,
                  language === "id"
                    ? `Halo ${settings.admin_display_name}, saya baru memesan sewa:\nKode Booking: ${createdBooking.booking_code}\nBarang: ${displayName} (${createdBooking.quantity}x, ${createdBooking.days} hari)\nNama: ${createdBooking.renter_name}\nTotal: ${formatRupiah(createdBooking.total_amount)}\nMetode: ${createdBooking.payment_method}\nMohon bantu verifikasi ya!`
                    : `Hi ${settings.admin_display_name}, I just submitted a rental booking:\nBooking Code: ${createdBooking.booking_code}\nItem: ${displayName} (${createdBooking.quantity}x, ${createdBooking.days} days)\nName: ${createdBooking.renter_name}\nTotal: ${formatRupiah(createdBooking.total_amount)}\nMethod: ${createdBooking.payment_method}\nPlease verify my booking!`
                )}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-[44px] w-full flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-center text-sm font-extrabold leading-tight whitespace-nowrap text-white transition hover:bg-emerald-700"
              >
                <MessageCircle className="h-4 w-4 shrink-0" />
                <span>{t.bookingModal.confirmWaBtn}</span>
                <ExternalLink className="h-3.5 w-3.5 shrink-0" />
              </a>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenMyRentals();
                }}
                className="inline-flex min-h-[44px] w-full flex-1 items-center justify-center gap-2 rounded-xl bg-[var(--blue)] px-4 py-3 text-center text-sm font-extrabold leading-tight whitespace-nowrap text-white transition hover:bg-[var(--blue-dark)]"
              >
                <span>{t.bookingModal.openMyRentals}</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-12">
            {/* Left Column: Item Details */}
            <div className="min-w-0 space-y-4 lg:col-span-5">
              <div
                className={`relative aspect-[4/3] overflow-hidden rounded-2xl border border-[var(--line)] tone-${item.tone}`}
              >
                {item.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.image_url}
                    alt={displayName}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-7xl leading-none">
                    {item.emoji}
                  </div>
                )}
              </div>

              {displayDesc ? (
                <p className="text-sm leading-relaxed text-[var(--muted)]">{displayDesc}</p>
              ) : null}

              <div className="space-y-2.5 rounded-2xl border border-[var(--line)] bg-[var(--surface-subtle)] p-4 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="flex shrink-0 items-center gap-1.5 text-[var(--muted)]">
                    <User className="h-3.5 w-3.5 shrink-0" /> {t.bookingModal.ownerLabel}
                  </span>
                  <strong className="min-w-0 break-words text-right text-[var(--ink)]">{item.owner_name}</strong>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="flex shrink-0 items-center gap-1.5 text-[var(--muted)]">
                    <MapPin className="h-3.5 w-3.5 shrink-0" /> {t.bookingModal.pickupLabel}
                  </span>
                  <strong className="min-w-0 break-words text-right text-[var(--ink)]">{item.location}</strong>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="shrink-0 text-[var(--muted)]">{t.bookingModal.stockLabel}</span>
                  <strong className="font-mono-num text-right text-[var(--ink)]">
                    {item.stock_available} / {item.stock_total} {t.catalog.unitsLeft}
                  </strong>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="shrink-0 text-[var(--muted)]">{t.bookingModal.maxPeriodLabel}</span>
                  <strong className="font-mono-num text-right text-[var(--ink)]">
                    {item.max_days} {t.catalog.days}
                  </strong>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="flex shrink-0 items-center gap-1.5 text-[var(--muted)]">
                    <Shield className="h-3.5 w-3.5 shrink-0" /> {t.bookingModal.depositLabel}
                  </span>
                  <strong className="font-mono-num text-right text-[var(--ink)]">
                    {item.deposit_amount > 0 ? formatRupiah(item.deposit_amount) : t.catalog.noDeposit}
                  </strong>
                </div>
              </div>

              <a
                href={inquiryWaUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex min-h-[42px] w-full items-center justify-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-center text-sm font-bold leading-tight whitespace-nowrap text-emerald-700 transition hover:bg-emerald-500/20 dark:text-emerald-300"
              >
                <MessageCircle className="h-4 w-4 shrink-0" />
                <span>{t.bookingModal.askAdminWa}</span>
              </a>
            </div>

            {/* Right Column: Guest Checkout Form */}
            <form onSubmit={handleSubmit} className="min-w-0 space-y-5 lg:col-span-7">
              {item.stock_available <= 0 ? (
                <div className="rounded-2xl border border-rose-500/30 bg-[var(--danger-bg)] p-4 text-sm font-bold text-[var(--danger-ink)]">
                  {t.catalog.outOfStock}
                </div>
              ) : null}

              {/* Step 1: Borrower Identity */}
              <div className="space-y-3 rounded-2xl border border-[var(--line)] bg-[var(--surface-subtle)]/50 p-4">
                <h3 className="text-sm font-extrabold text-[var(--ink)]">
                  {t.bookingModal.formSectionTitle}
                </h3>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-bold text-[var(--ink)]">
                      {t.bookingModal.fullName}
                    </label>
                    <input
                      required
                      minLength={2}
                      value={renterName}
                      onChange={(e) => setRenterName(e.target.value)}
                      placeholder={t.bookingModal.fullNamePh}
                      className="w-full rounded-xl border border-[var(--line)] bg-[var(--paper)] px-3 py-2.5 text-sm text-[var(--ink)] outline-none focus:border-[var(--blue)]"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-bold text-[var(--ink)]">
                      {t.bookingModal.whatsapp}
                    </label>
                    <input
                      required
                      minLength={8}
                      value={renterPhone}
                      onChange={(e) => setRenterPhone(e.target.value)}
                      placeholder={t.bookingModal.whatsappPh}
                      className="w-full rounded-xl border border-[var(--line)] bg-[var(--paper)] px-3 py-2.5 text-sm text-[var(--ink)] outline-none focus:border-[var(--blue)]"
                    />
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <div>
                    <label className="mb-1 block text-xs font-bold text-[var(--ink)]">
                      {t.bookingModal.idType}
                    </label>
                    <select
                      value={idType}
                      onChange={(e) =>
                        setIdType(e.target.value as "KTM" | "KTP" | "SIM" | "PASSPORT")
                      }
                      className="w-full rounded-xl border border-[var(--line)] bg-[var(--paper)] px-3 py-2.5 text-sm text-[var(--ink)] outline-none focus:border-[var(--blue)]"
                    >
                      <option value="KTM">KTM</option>
                      <option value="KTP">KTP</option>
                      <option value="SIM">SIM</option>
                      <option value="PASSPORT">Passport</option>
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="mb-1 block text-xs font-bold text-[var(--ink)]">
                      {t.bookingModal.idNumber}
                    </label>
                    <input
                      required
                      minLength={4}
                      value={idNumber}
                      onChange={(e) => setIdNumber(e.target.value)}
                      placeholder={t.bookingModal.idNumberPh}
                      className="w-full rounded-xl border border-[var(--line)] bg-[var(--paper)] px-3 py-2.5 text-sm text-[var(--ink)] outline-none focus:border-[var(--blue)]"
                    />
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-bold text-[var(--ink)]">
                      {t.bookingModal.address}
                    </label>
                    <input
                      required
                      minLength={3}
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder={t.bookingModal.addressPh}
                      className="w-full rounded-xl border border-[var(--line)] bg-[var(--paper)] px-3 py-2.5 text-sm text-[var(--ink)] outline-none focus:border-[var(--blue)]"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-bold text-[var(--ink)]">
                      {t.bookingModal.email}
                    </label>
                    <input
                      type="email"
                      value={renterEmail}
                      onChange={(e) => setRenterEmail(e.target.value)}
                      placeholder={t.bookingModal.emailPh}
                      className="w-full rounded-xl border border-[var(--line)] bg-[var(--paper)] px-3 py-2.5 text-sm text-[var(--ink)] outline-none focus:border-[var(--blue)]"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-bold text-[var(--ink)]">
                    {t.bookingModal.notes}
                  </label>
                  <input
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder={t.bookingModal.notesPh}
                    className="w-full rounded-xl border border-[var(--line)] bg-[var(--paper)] px-3 py-2.5 text-sm text-[var(--ink)] outline-none focus:border-[var(--blue)]"
                  />
                </div>
              </div>

              {/* Step 2: Duration & Quantity */}
              <div className="space-y-3 rounded-2xl border border-[var(--line)] bg-[var(--surface-subtle)]/50 p-4">
                <h3 className="text-sm font-extrabold text-[var(--ink)]">
                  {t.bookingModal.rentalSectionTitle}
                </h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-bold text-[var(--ink)]">
                      {t.bookingModal.quantity}
                    </label>
                    <select
                      value={quantity}
                      onChange={(e) => setQuantity(Number(e.target.value))}
                      disabled={item.stock_available <= 0}
                      className="w-full rounded-xl border border-[var(--line)] bg-[var(--paper)] px-3 py-2.5 text-sm font-semibold text-[var(--ink)] outline-none focus:border-[var(--blue)]"
                    >
                      {Array.from(
                        { length: Math.max(1, item.stock_available) },
                        (_, idx) => idx + 1
                      ).map((qty) => (
                        <option key={qty} value={qty}>
                          {qty} {t.catalog.unitsLeft}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-bold text-[var(--ink)]">
                      {t.bookingModal.duration}
                    </label>
                    <select
                      value={days}
                      onChange={(e) => setDays(Number(e.target.value))}
                      className="w-full rounded-xl border border-[var(--line)] bg-[var(--paper)] px-3 py-2.5 text-sm font-semibold text-[var(--ink)] outline-none focus:border-[var(--blue)]"
                    >
                      {Array.from(
                        { length: Math.max(1, item.max_days) },
                        (_, idx) => idx + 1
                      ).map((d) => (
                        <option key={d} value={d}>
                          {d} {t.catalog.days}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Step 3: Payment & QRIS */}
              <div className="space-y-3 rounded-2xl border border-[var(--line)] bg-[var(--surface-subtle)]/50 p-4">
                <h3 className="text-sm font-extrabold text-[var(--ink)]">
                  {t.bookingModal.paymentSectionTitle}
                </h3>

                <div>
                  <label className="mb-1 block text-xs font-bold text-[var(--ink)]">
                    {t.bookingModal.paymentMethod}
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full rounded-xl border border-[var(--line)] bg-[var(--paper)] px-3 py-2.5 text-sm font-semibold text-[var(--ink)] outline-none focus:border-[var(--blue)]"
                  >
                    {(settings.bank_accounts || [{ code: "QRIS", label: "QRIS" }]).map((opt) => (
                      <option key={opt.code} value={opt.code}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Price Breakdown */}
                <div className="space-y-1.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] p-3.5 text-sm">
                  <div className="flex justify-between text-[var(--muted)]">
                    <span>
                      {t.bookingModal.subtotal} ({quantity}x · {days} {t.catalog.days})
                    </span>
                    <span className="font-mono-num font-semibold text-[var(--ink)]">
                      {formatRupiah(subtotal)}
                    </span>
                  </div>
                  <div className="flex justify-between text-[var(--muted)]">
                    <span>
                      {t.bookingModal.serviceFee} ({Number(settings.service_fee_pct)}%)
                    </span>
                    <span className="font-mono-num font-semibold text-[var(--ink)]">
                      {formatRupiah(serviceFee)}
                    </span>
                  </div>
                  {depositTotal > 0 ? (
                    <div className="flex justify-between text-[var(--muted)]">
                      <span>{t.bookingModal.depositTotal}</span>
                      <span className="font-mono-num font-semibold text-[var(--ink)]">
                        {formatRupiah(depositTotal)}
                      </span>
                    </div>
                  ) : null}
                  <div className="flex justify-between border-t border-[var(--line)] pt-2 text-base font-extrabold">
                    <span className="text-[var(--ink)]">{t.bookingModal.totalPayable}</span>
                    <span className="font-mono-num text-[var(--blue)]">
                      {formatRupiah(totalPayable)}
                    </span>
                  </div>
                </div>

                {/* Live QRIS or Bank Transfer Card */}
                {paymentMethod === "QRIS" ? (
                  <QrisCard
                    settings={settings}
                    amount={totalPayable}
                    referenceLabel={displayName}
                  />
                ) : selectedAccount ? (
                  <div className="rounded-xl border border-[var(--line)] bg-[var(--paper)] p-3.5 text-sm">
                    <div className="text-xs font-extrabold text-[var(--blue)] uppercase">
                      {selectedAccount.label}
                    </div>
                    <div className="font-mono-num mt-1 text-lg font-extrabold text-[var(--ink)]">
                      {selectedAccount.account_number}
                    </div>
                    <div className="text-xs text-[var(--muted)]">
                      a.n. {selectedAccount.account_holder}
                    </div>
                  </div>
                ) : null}

                {/* Upload Payment Proof */}
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="min-w-0">
                    <label className="mb-1 block text-xs font-bold text-[var(--ink)]">
                      {t.bookingModal.proofLabel}
                    </label>
                    <label className="flex min-h-[42px] cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--blue)]/50 bg-[var(--paper)] px-3 py-2.5 text-center text-xs font-bold leading-tight text-[var(--blue)] transition hover:bg-[var(--blue-soft)]">
                      <Upload className="h-4 w-4 shrink-0" />
                      <span className="truncate">
                        {uploadingProof
                          ? "Uploading..."
                          : proofUrl
                          ? language === "id"
                            ? "Bukti terunggah ✓ (ganti)"
                            : "Receipt uploaded ✓ (replace)"
                          : language === "id"
                          ? "Pilih file gambar bukti"
                          : "Choose receipt image"}
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleProofUpload}
                        className="hidden"
                      />
                    </label>
                    <p className="mt-1 text-[11px] text-[var(--muted)]">{t.bookingModal.proofHint}</p>
                  </div>

                  <div className="min-w-0">
                    <label className="mb-1 block text-xs font-bold text-[var(--ink)]">
                      {t.bookingModal.referenceLabel}
                    </label>
                    <input
                      value={paymentReference}
                      onChange={(e) => setPaymentReference(e.target.value)}
                      placeholder={t.bookingModal.referencePh}
                      className="min-w-0 w-full rounded-xl border border-[var(--line)] bg-[var(--paper)] px-3 py-2.5 text-sm text-[var(--ink)] outline-none focus:border-[var(--blue)]"
                    />
                  </div>
                </div>

                {proofUrl ? (
                  <div className="overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--paper)] p-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={proofUrl}
                      alt="Payment proof preview"
                      className="mx-auto max-h-36 rounded-lg object-contain"
                    />
                  </div>
                ) : null}
              </div>

              {errorMsg ? (
                <div className="rounded-xl border border-rose-500/30 bg-[var(--danger-bg)] px-4 py-3 text-sm font-bold text-[var(--danger-ink)]">
                  {errorMsg}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={submitting || uploadingProof || item.stock_available <= 0}
                className="w-full rounded-xl bg-[var(--blue)] px-5 py-3.5 text-sm font-extrabold text-white shadow-md transition hover:bg-[var(--blue-dark)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? t.bookingModal.submitting : t.bookingModal.submitBtn}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

