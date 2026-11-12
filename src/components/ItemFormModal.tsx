"use client";

import React, { useState } from "react";
import { Upload, X } from "lucide-react";
import { usePreferences } from "@/components/PreferencesProvider";
import { uploadImageToBucket } from "@/lib/upload";
import type { CardTone, ItemCategory, RentalItem } from "@/types/rental";

interface ItemFormModalProps {
  open: boolean;
  item: RentalItem | null; // null = create mode, non-null = edit mode
  onClose: () => void;
  onSaved: (item: RentalItem) => void;
}

const CATEGORIES: ItemCategory[] = ["Study", "Tech", "Creative", "Lifestyle", "Events", "Other"];
const TONES: CardTone[] = ["blue", "yellow", "green", "pink", "lavender", "peach"];
const EMOJIS = ["📦", "📚", "🧮", "💻", "📷", "🎧", "📽️", "💡", "🚲", "🖱️", "🔊", "🎨", "⛺", "🎙️", "🔋"];
const BANKS = ["BCA", "Mandiri", "BNI", "BRI", "BSI", "BTN", "Bank Jago", "DANA", "GoPay", "OVO", "Other"];

export function ItemFormModal({ open, item, onClose, onSaved }: ItemFormModalProps) {
  if (!open) return null;
  return (
    <ItemFormModalInner
      key={item ? `edit-${item.id}` : "create-new"}
      item={item}
      onClose={onClose}
      onSaved={onSaved}
    />
  );
}

function ItemFormModalInner({
  item,
  onClose,
  onSaved,
}: Omit<ItemFormModalProps, "open">) {
  const { language } = usePreferences();

  const [name, setName] = useState(item?.name ?? "");
  const [nameId, setNameId] = useState(item?.name_id ?? "");
  const [description, setDescription] = useState(item?.description ?? "");
  const [descriptionId, setDescriptionId] = useState(item?.description_id ?? "");
  const [category, setCategory] = useState<ItemCategory>(item?.category ?? "Tech");
  const [emoji, setEmoji] = useState(item?.emoji ?? "📦");
  const [tone, setTone] = useState<CardTone>(item?.tone ?? "blue");
  const [imageUrl, setImageUrl] = useState<string>(item?.image_url ?? "");
  const [pricePerDay, setPricePerDay] = useState(item?.price_per_day ?? 25000);
  const [depositAmount, setDepositAmount] = useState(item?.deposit_amount ?? 0);
  const [maxDays, setMaxDays] = useState(item?.max_days ?? 5);
  const [stockTotal, setStockTotal] = useState(item?.stock_total ?? 1);
  const [stockAvailable, setStockAvailable] = useState(item?.stock_available ?? 1);
  const [location, setLocation] = useState(item?.location ?? "Student Center");
  const [condition, setCondition] = useState(item?.condition ?? "Great condition");
  const [conditionId, setConditionId] = useState(item?.condition_id ?? "Kondisi prima");
  const [payoutBank, setPayoutBank] = useState(item?.payout_bank || "BCA");
  const [payoutHolder, setPayoutHolder] = useState(item?.payout_holder ?? "");
  const [payoutNumber, setPayoutNumber] = useState(item?.payout_number ?? "");
  const [isActive, setIsActive] = useState(item?.is_active ?? true);

  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setErrorMsg(null);
    try {
      const url = await uploadImageToBucket("item-images", file, "catalog");
      setImageUrl(url);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Image upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg(null);

    try {
      const payload = {
        name,
        name_id: nameId || name,
        description,
        description_id: descriptionId || description,
        category,
        emoji,
        tone,
        image_url: imageUrl.trim() || null,
        price_per_day: Number(pricePerDay),
        deposit_amount: Number(depositAmount),
        max_days: Number(maxDays),
        stock_total: Number(stockTotal),
        stock_available: Number(stockAvailable),
        location,
        condition,
        condition_id: conditionId || condition,
        payout_bank: payoutBank,
        payout_holder: payoutHolder,
        payout_number: payoutNumber,
        is_active: isActive,
      };

      const res = await fetch(item ? `/api/items/${item.id}` : "/api/items", {
        method: item ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save item");
      onSaved(data.item);
      onClose();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 p-3 backdrop-blur-xs sm:p-5"
      onClick={onClose}
    >
      <div
        className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-[var(--line)] bg-[var(--paper)] p-5 shadow-2xl sm:p-7"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-3 border-b border-[var(--line)] pb-4">
          <div className="min-w-0">
            <h2 className="text-xl font-extrabold text-[var(--ink)]">
              {item
                ? language === "id"
                  ? "Edit Barang Sewa"
                  : "Edit Rental Item"
                : language === "id"
                ? "Tambah Barang Sewa Baru"
                : "Add New Rental Item"}
            </h2>
            <p className="mt-1 text-xs text-[var(--muted)]">
              {language === "id"
                ? "Lengkapi info barang, foto, stok, dan rekening payout."
                : "Fill in item details, photo, stock counts, and payout bank details."}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[var(--surface-subtle)] leading-none text-[var(--muted)] hover:text-[var(--ink)]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-bold text-[var(--ink)]">
                {language === "id" ? "Nama barang (English) *" : "Item name (English) *"}
              </label>
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Mirrorless Camera Kit"
                className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface-subtle)] px-3 py-2 text-sm text-[var(--ink)] outline-none focus:border-[var(--blue)]"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-[var(--ink)]">
                {language === "id" ? "Nama barang (Indonesia)" : "Item name (Indonesian)"}
              </label>
              <input
                value={nameId}
                onChange={(e) => setNameId(e.target.value)}
                placeholder="cth. Kamera Mirrorless Sony"
                className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface-subtle)] px-3 py-2 text-sm text-[var(--ink)] outline-none focus:border-[var(--blue)]"
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-bold text-[var(--ink)]">
                {language === "id" ? "Kategori *" : "Category *"}
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as ItemCategory)}
                className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface-subtle)] px-3 py-2 text-sm text-[var(--ink)]"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-[var(--ink)]">
                {language === "id" ? "Harga / hari (Rp) *" : "Price / day (Rp) *"}
              </label>
              <input
                type="number"
                required
                min={1000}
                step={500}
                value={pricePerDay}
                onChange={(e) => setPricePerDay(Number(e.target.value))}
                className="font-mono-num w-full rounded-xl border border-[var(--line)] bg-[var(--surface-subtle)] px-3 py-2 text-sm text-[var(--ink)]"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-[var(--ink)]">
                {language === "id" ? "Deposit (Rp)" : "Deposit (Rp)"}
              </label>
              <input
                type="number"
                min={0}
                step={5000}
                value={depositAmount}
                onChange={(e) => setDepositAmount(Number(e.target.value))}
                className="font-mono-num w-full rounded-xl border border-[var(--line)] bg-[var(--surface-subtle)] px-3 py-2 text-sm text-[var(--ink)]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div>
              <label className="mb-1 block text-xs font-bold text-[var(--ink)]">
                {language === "id" ? "Stok total *" : "Total stock *"}
              </label>
              <input
                type="number"
                min={1}
                max={100}
                value={stockTotal}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setStockTotal(val);
                  if (!item) setStockAvailable(val);
                }}
                className="font-mono-num w-full rounded-xl border border-[var(--line)] bg-[var(--surface-subtle)] px-3 py-2 text-sm text-[var(--ink)]"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-[var(--ink)]">
                {language === "id" ? "Stok tersedia *" : "Available stock *"}
              </label>
              <input
                type="number"
                min={0}
                max={stockTotal}
                value={stockAvailable}
                onChange={(e) => setStockAvailable(Number(e.target.value))}
                className="font-mono-num w-full rounded-xl border border-[var(--line)] bg-[var(--surface-subtle)] px-3 py-2 text-sm text-[var(--ink)]"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-[var(--ink)]">
                {language === "id" ? "Maks. hari *" : "Max days *"}
              </label>
              <input
                type="number"
                min={1}
                max={30}
                value={maxDays}
                onChange={(e) => setMaxDays(Number(e.target.value))}
                className="font-mono-num w-full rounded-xl border border-[var(--line)] bg-[var(--surface-subtle)] px-3 py-2 text-sm text-[var(--ink)]"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-[var(--ink)]">
                {language === "id" ? "Ikon & Warna" : "Icon & Tone"}
              </label>
              <div className="flex gap-1">
                <select
                  value={emoji}
                  onChange={(e) => setEmoji(e.target.value)}
                  className="w-16 rounded-xl border border-[var(--line)] bg-[var(--surface-subtle)] px-2 py-2 text-sm"
                >
                  {EMOJIS.map((em) => (
                    <option key={em} value={em}>
                      {em}
                    </option>
                  ))}
                </select>
                <select
                  value={tone}
                  onChange={(e) => setTone(e.target.value as CardTone)}
                  className="flex-1 rounded-xl border border-[var(--line)] bg-[var(--surface-subtle)] px-2 py-2 text-xs text-[var(--ink)]"
                >
                  {TONES.map((tn) => (
                    <option key={tn} value={tn}>
                      {tn}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-bold text-[var(--ink)]">
                {language === "id" ? "Lokasi pengambilan *" : "Pickup area *"}
              </label>
              <input
                required
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface-subtle)] px-3 py-2 text-sm text-[var(--ink)]"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-[var(--ink)]">
                Condition (EN)
              </label>
              <input
                value={condition}
                onChange={(e) => setCondition(e.target.value)}
                className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface-subtle)] px-3 py-2 text-sm text-[var(--ink)]"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-[var(--ink)]">
                Kondisi (ID)
              </label>
              <input
                value={conditionId}
                onChange={(e) => setConditionId(e.target.value)}
                className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface-subtle)] px-3 py-2 text-sm text-[var(--ink)]"
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-bold text-[var(--ink)]">
                Description (EN)
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface-subtle)] px-3 py-2 text-sm text-[var(--ink)]"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-[var(--ink)]">
                Deskripsi (ID)
              </label>
              <textarea
                rows={2}
                value={descriptionId}
                onChange={(e) => setDescriptionId(e.target.value)}
                className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface-subtle)] px-3 py-2 text-sm text-[var(--ink)]"
              />
            </div>
          </div>

          <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface-subtle)] p-3.5">
            <label className="mb-1.5 block text-xs font-bold text-[var(--ink)]">
              {language === "id" ? "Foto Barang (Upload atau URL)" : "Item Image (Upload or URL)"}
            </label>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <label className="inline-flex shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-[var(--blue-soft)] px-3.5 py-2.5 text-xs font-bold leading-none whitespace-nowrap text-[var(--blue)] hover:opacity-90">
                <Upload className="h-3.5 w-3.5 shrink-0" />
                <span>{uploading ? "Uploading..." : language === "id" ? "Upload Foto" : "Upload Photo"}</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </label>
              <input
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://... or /images/items/..."
                className="min-w-0 w-full flex-1 rounded-xl border border-[var(--line)] bg-[var(--paper)] px-3 py-2 text-xs text-[var(--ink)]"
              />
            </div>
            {imageUrl ? (
              <div className="mt-2.5 flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imageUrl}
                  alt="Preview"
                  className="h-20 w-28 rounded-xl border border-[var(--line)] object-cover"
                />
                <button
                  type="button"
                  onClick={() => setImageUrl("")}
                  className="text-xs font-bold text-rose-500 hover:underline"
                >
                  {language === "id" ? "Hapus foto" : "Remove image"}
                </button>
              </div>
            ) : null}
          </div>

          <div className="grid gap-3 rounded-2xl border border-[var(--line)] bg-[var(--surface-subtle)] p-3.5 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-bold text-[var(--ink)]">
                {language === "id" ? "Bank / E-Wallet Payout" : "Payout Bank / Wallet"}
              </label>
              <select
                value={payoutBank}
                onChange={(e) => setPayoutBank(e.target.value)}
                className="w-full rounded-xl border border-[var(--line)] bg-[var(--paper)] px-3 py-2 text-sm text-[var(--ink)]"
              >
                {BANKS.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-[var(--ink)]">
                {language === "id" ? "Nama pemilik rek" : "Account holder"}
              </label>
              <input
                value={payoutHolder}
                onChange={(e) => setPayoutHolder(e.target.value)}
                className="w-full rounded-xl border border-[var(--line)] bg-[var(--paper)] px-3 py-2 text-sm text-[var(--ink)]"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-[var(--ink)]">
                {language === "id" ? "No. Rekening / ID" : "Account number / ID"}
              </label>
              <input
                value={payoutNumber}
                onChange={(e) => setPayoutNumber(e.target.value)}
                className="font-mono-num w-full rounded-xl border border-[var(--line)] bg-[var(--paper)] px-3 py-2 text-sm text-[var(--ink)]"
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-xs font-bold text-[var(--ink)]">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="h-4 w-4 accent-[var(--blue)]"
            />
            {language === "id"
              ? "Tampilkan barang ini di katalog publik"
              : "Publish item on public catalog"}
          </label>

          {errorMsg ? (
            <div className="rounded-xl bg-[var(--danger-bg)] px-3 py-2.5 text-xs font-bold text-[var(--danger-ink)]">
              {errorMsg}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={saving || uploading}
            className="w-full rounded-xl bg-[var(--blue)] px-4 py-3 text-sm font-extrabold text-white transition hover:bg-[var(--blue-dark)] disabled:opacity-50"
          >
            {saving
              ? "..."
              : item
              ? language === "id"
                ? "Simpan Perubahan"
                : "Save Changes"
              : language === "id"
              ? "Tambahkan ke Katalog"
              : "Publish Item"}
          </button>
        </form>
      </div>
    </div>
  );
}
