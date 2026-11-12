"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  Edit3,
  Languages,
  LogOut,
  MessageCircle,
  Moon,
  Package,
  Plus,
  ShieldCheck,
  Store,
  Sun,
  Trash2,
} from "lucide-react";
import { ItemFormModal } from "@/components/ItemFormModal";
import { usePreferences } from "@/components/PreferencesProvider";
import { buildWhatsAppUrl, formatDateTime, formatRupiah } from "@/lib/format";
import { getRoleLabel, getStatusLabel } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/client";
import type { Booking, RbacContext, RentalItem } from "@/types/rental";

interface OwnerDashboardClientProps {
  rbac: RbacContext;
  initialItems: RentalItem[];
  initialBookings: Booking[];
}

export function OwnerDashboardClient({
  rbac,
  initialItems,
  initialBookings,
}: OwnerDashboardClientProps) {
  const router = useRouter();
  const { theme, language, toggleTheme, toggleLanguage, t } = usePreferences();

  const [tab, setTab] = useState<"listings" | "incoming">("listings");
  const [items, setItems] = useState<RentalItem[]>(initialItems);
  const [bookings, setBookings] = useState<Booking[]>(initialBookings);
  const [editingItem, setEditingItem] = useState<RentalItem | null>(null);
  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast((p) => (p === msg ? null : p)), 3000);
  };

  const refreshData = async () => {
    const [itemsRes, bookingsRes] = await Promise.all([
      fetch("/api/items?scope=mine", { cache: "no-store" }),
      fetch("/api/admin/bookings?scope=mine", { cache: "no-store" }),
    ]);
    if (itemsRes.ok) {
      const d = await itemsRes.json();
      setItems(d.items || []);
    }
    if (bookingsRes.ok) {
      const d = await bookingsRes.json();
      setBookings(d.bookings || []);
    }
  };

  const handleDeleteItem = async (itemId: number) => {
    const ok = window.confirm(
      language === "id"
        ? "Hapus barang ini dari daftar Anda?"
        : "Delete this item from your listings?"
    );
    if (!ok) return;
    const res = await fetch(`/api/items/${itemId}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) {
      showToast(data.error || "Failed to delete");
      return;
    }
    showToast(language === "id" ? "Barang dihapus." : "Item deleted.");
    await refreshData();
  };

  const handleConfirmReturn = async (bookingId: string) => {
    const res = await fetch("/api/admin/bookings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "confirm_owner_return", booking_id: bookingId }),
    });
    const data = await res.json();
    if (!res.ok) {
      showToast(data.error || "Failed");
      return;
    }
    showToast(
      language === "id"
        ? "Pengembalian dikonfirmasi & stok dipulihkan!"
        : "Return confirmed & stock restored!"
    );
    await refreshData();
  };

  const handleResolveExt = async (extensionId: string, decision: "approve" | "reject") => {
    const res = await fetch("/api/admin/bookings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "resolve_extension", extension_id: extensionId, decision }),
    });
    const data = await res.json();
    if (!res.ok) {
      showToast(data.error || "Failed");
      return;
    }
    showToast(
      decision === "approve"
        ? language === "id"
          ? "Perpanjangan disetujui!"
          : "Extension approved!"
        : language === "id"
        ? "Perpanjangan ditolak."
        : "Extension rejected."
    );
    await refreshData();
  };

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  const canAdmin = rbac.role === "admin" || rbac.role === "staff";

  return (
    <div className="min-h-screen overflow-x-clip bg-[var(--canvas)]">
      <header className="sticky top-0 z-20 border-b border-[var(--line)] bg-[var(--paper)]/95 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-2 px-3 sm:gap-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <Link
              href="/"
              aria-label={language === "id" ? "Katalog" : "Storefront"}
              className="inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-xl border border-[var(--line)] bg-[var(--surface-subtle)] px-2.5 text-xs font-bold leading-none whitespace-nowrap text-[var(--ink)] hover:border-[var(--blue)] sm:h-9 sm:px-3"
            >
              <ArrowLeft className="h-3.5 w-3.5 shrink-0" />
              <span className="hidden sm:inline">{language === "id" ? "Katalog" : "Storefront"}</span>
            </Link>
            <div className="flex min-w-0 items-center gap-1.5 sm:gap-2">
              <Store className="h-5 w-5 shrink-0 text-[var(--blue)]" />
              <span className="truncate text-sm font-extrabold text-[var(--ink)] sm:text-base">
                <span className="sm:hidden">{language === "id" ? "Mitra" : "Partner"}</span>
                <span className="hidden sm:inline">
                  {language === "id" ? "Panel Mitra / Pemilik" : "Owner Partner Hub"}
                </span>
              </span>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <span className="hidden max-w-[220px] truncate rounded-full bg-[var(--blue-soft)] px-3 py-1.5 text-xs font-extrabold leading-none text-[var(--blue)] md:inline-flex">
              {getRoleLabel(rbac.role, language)} · {rbac.profile?.full_name}
            </span>
            {canAdmin ? (
              <Link
                href="/admin"
                className="inline-flex h-8 shrink-0 items-center justify-center gap-1 rounded-xl bg-[var(--yellow-soft)] px-2.5 text-xs font-extrabold leading-none whitespace-nowrap text-[var(--warn-ink)] sm:h-9 sm:px-3"
              >
                <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
                <span>Admin</span>
              </Link>
            ) : null}
            <button
              type="button"
              onClick={toggleLanguage}
              className="inline-flex h-8 shrink-0 items-center justify-center gap-1 rounded-xl border border-[var(--line)] bg-[var(--surface-subtle)] px-2 text-[11px] font-bold leading-none whitespace-nowrap text-[var(--ink)] sm:h-9 sm:px-2.5 sm:text-xs"
            >
              <Languages className="h-3.5 w-3.5 shrink-0 text-[var(--blue)]" />
              <span>{language.toUpperCase()}</span>
            </button>
            <button
              type="button"
              onClick={toggleTheme}
              aria-label="Toggle theme"
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-[var(--line)] bg-[var(--surface-subtle)] leading-none text-[var(--ink)] sm:h-9 sm:w-9"
            >
              {theme === "dark" ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-[var(--blue)]" />}
            </button>
            <button
              type="button"
              onClick={handleLogout}
              aria-label={t.nav.logout}
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-bold leading-none text-[var(--muted)] hover:bg-rose-500/10 hover:text-rose-500 sm:h-9 sm:w-9"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-3 py-6 sm:px-6 sm:py-8">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setTab("listings")}
              className={`inline-flex items-center justify-center gap-2 rounded-full border px-4 py-2 text-xs font-extrabold leading-none whitespace-nowrap transition ${
                tab === "listings"
                  ? "border-[var(--blue)] bg-[var(--blue)] text-white"
                  : "border-[var(--line)] bg-[var(--paper)] text-[var(--ink)]"
              }`}
            >
              <Package className="h-3.5 w-3.5 shrink-0" />
              <span>{language === "id" ? `Barang Saya (${items.length})` : `My Listings (${items.length})`}</span>
            </button>
            <button
              type="button"
              onClick={() => setTab("incoming")}
              className={`inline-flex items-center justify-center gap-2 rounded-full border px-4 py-2 text-xs font-extrabold leading-none whitespace-nowrap transition ${
                tab === "incoming"
                  ? "border-[var(--blue)] bg-[var(--blue)] text-white"
                  : "border-[var(--line)] bg-[var(--paper)] text-[var(--ink)]"
              }`}
            >
              <span>
                {language === "id"
                  ? `Sewa Masuk (${bookings.length})`
                  : `Incoming Rentals (${bookings.length})`}
              </span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              setEditingItem(null);
              setItemModalOpen(true);
            }}
            className="inline-flex min-h-[40px] w-full items-center justify-center gap-1.5 rounded-xl bg-[var(--blue)] px-4 py-2.5 text-xs font-extrabold leading-none whitespace-nowrap text-white shadow-sm hover:bg-[var(--blue-dark)] sm:w-auto"
          >
            <Plus className="h-4 w-4 shrink-0" />
            <span>{language === "id" ? "Tambah Barang Baru" : "Add New Listing"}</span>
          </button>
        </div>

        {tab === "listings" ? (
          items.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-[var(--line)] bg-[var(--paper)] p-10 text-center text-sm text-[var(--muted)]">
              {language === "id"
                ? "Belum ada barang milik Anda. Klik 'Tambah Barang Baru' untuk mulai menyewakan."
                : "You don't have any listings yet. Click 'Add New Listing' to start renting."}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((item) => (
                <article
                  key={item.id}
                  className="flex min-w-0 flex-col overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--paper)]"
                >
                  <div className={`relative h-40 tone-${item.tone}`}>
                    {item.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.image_url} alt={item.name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-5xl leading-none">
                        {item.emoji}
                      </div>
                    )}
                    <span
                      className={`absolute top-2.5 right-2.5 inline-flex items-center justify-center rounded-full px-2.5 py-1 text-[10px] font-extrabold leading-none whitespace-nowrap ${
                        item.is_active ? "bg-emerald-600 text-white" : "bg-slate-600 text-white"
                      }`}
                    >
                      {item.is_active ? (language === "id" ? "Aktif" : "Active") : "Draft"}
                    </span>
                  </div>
                  <div className="flex flex-1 flex-col p-4">
                    <div className="font-mono-num truncate text-[11px] font-extrabold text-[var(--blue)] uppercase">
                      {item.category} · {item.stock_available}/{item.stock_total} unit
                    </div>
                    <h3 className="mt-1 truncate text-base font-extrabold text-[var(--ink)]">
                      {language === "id" && item.name_id ? item.name_id : item.name}
                    </h3>
                    <div className="font-mono-num mt-1 text-sm font-bold text-[var(--ink)]">
                      {formatRupiah(item.price_per_day)} / hari
                    </div>
                    <div className="mt-1 truncate text-xs text-[var(--muted)]">
                      Payout: {item.payout_bank || "-"} {item.payout_number}
                    </div>
                    <div className="mt-auto flex gap-2 border-t border-[var(--line)] pt-3">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingItem(item);
                          setItemModalOpen(true);
                        }}
                        className="inline-flex min-h-[38px] flex-1 items-center justify-center gap-1.5 rounded-xl bg-[var(--blue-soft)] px-3 py-2 text-xs font-extrabold leading-none whitespace-nowrap text-[var(--blue)]"
                      >
                        <Edit3 className="h-3.5 w-3.5 shrink-0" />
                        <span>Edit</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteItem(item.id)}
                        aria-label="Delete item"
                        className="inline-flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-xl bg-[var(--danger-bg)] text-xs font-extrabold leading-none text-[var(--danger-ink)]"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )
        ) : bookings.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-[var(--line)] bg-[var(--paper)] p-10 text-center text-sm text-[var(--muted)]">
            {language === "id"
              ? "Belum ada pesanan masuk untuk barang Anda."
              : "No incoming rental requests for your listings yet."}
          </div>
        ) : (
          <div className="space-y-4">
            {bookings.map((b) => {
              const pendingExt = b.extensions?.find((ex) => ex.status === "pending");
              return (
                <article
                  key={b.id}
                  className="rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-4 shadow-xs sm:p-5"
                >
                  <div className="flex flex-col justify-between gap-3 border-b border-[var(--line)] pb-3 sm:flex-row sm:items-start">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-mono-num inline-flex items-center justify-center rounded-lg bg-[var(--blue-soft)] px-2.5 py-1 text-xs font-extrabold leading-none text-[var(--blue)]">
                          {b.booking_code}
                        </span>
                        <span className="inline-flex items-center justify-center rounded-full bg-[var(--warn-bg)] px-2.5 py-1 text-[11px] font-bold leading-none whitespace-nowrap text-[var(--warn-ink)]">
                          {getStatusLabel(b.status, language)}
                        </span>
                        <span className="inline-flex items-center justify-center rounded-full bg-[var(--surface-subtle)] px-2.5 py-1 text-[11px] font-bold leading-none whitespace-nowrap text-[var(--ink)]">
                          {getStatusLabel(b.payment_status, language)}
                        </span>
                      </div>
                      <h3 className="mt-2 break-words text-base font-extrabold text-[var(--ink)]">
                        {b.item_name} · {b.quantity}x · {b.days} {language === "id" ? "hari" : "days"}
                      </h3>
                    </div>

                    <a
                      href={buildWhatsAppUrl(
                        b.renter_phone,
                        `Halo ${b.renter_name}, terkait sewa ${b.item_name} (${b.booking_code}) di RentUs.`
                      )}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-[36px] w-full shrink-0 items-center justify-center gap-1.5 rounded-xl bg-emerald-600/15 px-3 py-2 text-xs font-bold leading-none whitespace-nowrap text-emerald-700 sm:w-auto dark:text-emerald-300"
                    >
                      <MessageCircle className="h-3.5 w-3.5 shrink-0" />
                      <span className="max-w-[160px] truncate">WhatsApp {b.renter_name}</span>
                    </a>
                  </div>

                  <div className="mt-3 grid gap-3 text-xs sm:grid-cols-3">
                    <div className="min-w-0 rounded-xl bg-[var(--surface-subtle)] p-3">
                      <div className="font-bold text-[var(--muted)]">
                        {language === "id" ? "Identitas Peminjam" : "Borrower Identity"}
                      </div>
                      <div className="mt-1 font-extrabold text-[var(--ink)]">{b.renter_name}</div>
                      <div className="font-mono-num text-[var(--muted)]">
                        {b.renter_identity_type}: {b.renter_identity_number}
                      </div>
                      <div className="break-words text-[var(--muted)]">{b.renter_address}</div>
                    </div>

                    <div className="min-w-0 rounded-xl bg-[var(--surface-subtle)] p-3">
                      <div className="font-bold text-[var(--muted)]">
                        {language === "id" ? "Periode Sewa" : "Rental Period"}
                      </div>
                      <div className="mt-1 font-semibold text-[var(--ink)]">
                        {formatDateTime(b.start_at, language)}
                      </div>
                      <div className="text-[var(--muted)]">→ {formatDateTime(b.due_at, language)}</div>
                    </div>

                    <div className="min-w-0 rounded-xl bg-[var(--surface-subtle)] p-3">
                      <div className="font-bold text-[var(--muted)]">
                        {language === "id" ? "Estimasi Payout Mitra" : "Owner Payout Estimate"}
                      </div>
                      <div className="mt-1 flex justify-between gap-2">
                        <span>Subtotal</span>
                        <span className="font-mono-num">{formatRupiah(b.subtotal)}</span>
                      </div>
                      <div className="flex justify-between gap-2 text-rose-500">
                        <span>{language === "id" ? "Komisi Platform (15%)" : "Commission (15%)"}</span>
                        <span className="font-mono-num">− {formatRupiah(b.platform_commission)}</span>
                      </div>
                      <div className="mt-1 flex justify-between gap-2 border-t border-[var(--line)] pt-1 font-extrabold text-[var(--blue)]">
                        <span>{language === "id" ? "Diterima Pemilik" : "Net Payout"}</span>
                        <span className="font-mono-num">{formatRupiah(b.owner_payout)}</span>
                      </div>
                    </div>
                  </div>

                  {pendingExt ? (
                    <div className="mt-3 flex flex-col justify-between gap-2.5 rounded-xl border border-amber-400/40 bg-[var(--warn-bg)] p-3 text-xs sm:flex-row sm:items-center">
                      <span className="font-bold text-[var(--warn-ink)]">
                        {language === "id"
                          ? `Pengajuan perpanjangan +${pendingExt.extra_days} hari (${formatRupiah(pendingExt.total_amount)})`
                          : `Extension request +${pendingExt.extra_days} days (${formatRupiah(pendingExt.total_amount)})`}
                      </span>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => handleResolveExt(pendingExt.id, "approve")}
                          className="inline-flex items-center justify-center rounded-lg bg-[var(--blue)] px-3.5 py-2 text-xs font-extrabold leading-none whitespace-nowrap text-white"
                        >
                          {language === "id" ? "Setujui" : "Approve"}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleResolveExt(pendingExt.id, "reject")}
                          className="inline-flex items-center justify-center rounded-lg bg-rose-600 px-3.5 py-2 text-xs font-extrabold leading-none whitespace-nowrap text-white"
                        >
                          {language === "id" ? "Tolak" : "Reject"}
                        </button>
                      </div>
                    </div>
                  ) : null}

                  <div className="mt-3 flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                    <div className="text-xs text-[var(--muted)]">
                      {language === "id" ? "Konfirmasi kembali:" : "Return confirmation:"}{" "}
                      <strong>
                        Renter {b.return_confirmed_by_renter ? "✓" : "⏳"} · Owner{" "}
                        {b.return_confirmed_by_owner ? "✓" : "⏳"}
                      </strong>
                    </div>

                    {!b.return_confirmed_by_owner && b.status !== "cancelled" ? (
                      <button
                        type="button"
                        onClick={() => handleConfirmReturn(b.id)}
                        className="inline-flex min-h-[38px] w-full items-center justify-center gap-1.5 rounded-xl bg-[var(--yellow-soft)] px-3.5 py-2 text-center text-xs font-extrabold leading-tight whitespace-nowrap text-[var(--warn-ink)] hover:opacity-90 sm:w-auto"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                        <span>{language === "id" ? "Konfirmasi Barang Kembali" : "Confirm Item Returned"}</span>
                      </button>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>

      <ItemFormModal
        open={itemModalOpen}
        item={editingItem}
        onClose={() => setItemModalOpen(false)}
        onSaved={() => {
          refreshData();
          showToast(language === "id" ? "Data barang disimpan!" : "Listing saved!");
        }}
      />

      {toast ? (
        <div className="fixed bottom-5 left-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-2xl bg-slate-900 px-4 py-3 text-center text-xs font-bold text-white shadow-xl">
          {toast}
        </div>
      ) : null}
    </div>
  );
}

