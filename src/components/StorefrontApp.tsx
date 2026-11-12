"use client";

import React, { useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  Clock,
  Heart,
  MapPin,
  MessageCircle,
  Search,
  Sparkles,
} from "lucide-react";
import { AuthModal } from "@/components/AuthModal";
import { ItemBookingModal } from "@/components/ItemBookingModal";
import { ItemFormModal } from "@/components/ItemFormModal";
import { MyRentalsModal } from "@/components/MyRentalsModal";
import { Navbar } from "@/components/Navbar";
import { PreferencesModal } from "@/components/PreferencesModal";
import { usePreferences } from "@/components/PreferencesProvider";
import { SavedItemsModal } from "@/components/SavedItemsModal";
import { buildWhatsAppUrl, formatRupiah, formatShortRupiah, formatWhatsAppDisplay } from "@/lib/format";
import { CATEGORIES } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/client";
import type {
  Booking,
  GuestBookingToken,
  ItemCategory,
  RbacContext,
  RentalItem,
  StoreSettings,
} from "@/types/rental";

interface StorefrontAppProps {
  initialItems: RentalItem[];
  initialSettings: StoreSettings;
  initialRbac: RbacContext;
}

type SortOption = "popular" | "price-low" | "price-high" | "newest" | "available";

const SAVED_EVENT = "rentus-saved-updated";
const TOKENS_EVENT = "rentus-tokens-updated";
const EMPTY_SAVED: number[] = [];
const EMPTY_TOKENS: GuestBookingToken[] = [];

let cachedSavedRaw = "";
let cachedSavedList: number[] = EMPTY_SAVED;
function getSavedSnapshot(): number[] {
  try {
    const raw = localStorage.getItem("rentus-saved-ids") || "[]";
    if (raw !== cachedSavedRaw) {
      cachedSavedRaw = raw;
      const parsed = JSON.parse(raw);
      cachedSavedList = Array.isArray(parsed)
        ? parsed.map(Number).filter(Number.isFinite)
        : EMPTY_SAVED;
    }
    return cachedSavedList;
  } catch {
    return EMPTY_SAVED;
  }
}

let cachedTokensRaw = "";
let cachedTokensList: GuestBookingToken[] = EMPTY_TOKENS;
function getTokensSnapshot(): GuestBookingToken[] {
  try {
    const raw = localStorage.getItem("rentus-my-bookings") || "[]";
    if (raw !== cachedTokensRaw) {
      cachedTokensRaw = raw;
      const parsed = JSON.parse(raw);
      cachedTokensList = Array.isArray(parsed)
        ? parsed.filter(
            (x): x is GuestBookingToken =>
              Boolean(x && typeof x.booking_code === "string" && typeof x.tracking_token === "string")
          )
        : EMPTY_TOKENS;
    }
    return cachedTokensList;
  } catch {
    return EMPTY_TOKENS;
  }
}

function subscribeSaved(cb: () => void) {
  window.addEventListener(SAVED_EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(SAVED_EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}

function subscribeTokens(cb: () => void) {
  window.addEventListener(TOKENS_EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(TOKENS_EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}

export function StorefrontApp({
  initialItems,
  initialSettings,
  initialRbac,
}: StorefrontAppProps) {
  const { language, t } = usePreferences();

  const [items, setItems] = useState<RentalItem[]>(initialItems);
  const [settings, setSettings] = useState<StoreSettings>(initialSettings);
  const [rbac, setRbac] = useState<RbacContext>(initialRbac);

  const [activeCategory, setActiveCategory] = useState<ItemCategory | "">("");
  const [sortBy, setSortBy] = useState<SortOption>("popular");
  const [searchTerm, setSearchTerm] = useState("");

  const savedIds = useSyncExternalStore(subscribeSaved, getSavedSnapshot, () => EMPTY_SAVED);
  const guestTokens = useSyncExternalStore(subscribeTokens, getTokensSnapshot, () => EMPTY_TOKENS);

  // Modals
  const [selectedItemForBooking, setSelectedItemForBooking] = useState<RentalItem | null>(null);
  const [savedModalOpen, setSavedModalOpen] = useState(false);
  const [rentalsModalOpen, setRentalsModalOpen] = useState(false);
  const [prefsModalOpen, setPrefsModalOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authInitialMode, setAuthInitialMode] = useState<"login" | "signup">("login");
  const [itemFormOpen, setItemFormOpen] = useState(false);

  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => {
      setToast((prev) => (prev === msg ? null : prev));
    }, 3200);
  };

  const refreshStorefront = async () => {
    try {
      const res = await fetch("/api/storefront", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data.items)) setItems(data.items);
      if (data.settings) setSettings(data.settings);
      if (data.rbac) setRbac(data.rbac);
    } catch {
      // Ignore transient refresh failure
    }
  };

  const toggleSave = (id: number) => {
    const exists = savedIds.includes(id);
    const next = exists ? savedIds.filter((x) => x !== id) : [...savedIds, id];
    try {
      localStorage.setItem("rentus-saved-ids", JSON.stringify(next));
    } catch {
      // Ignore
    }
    window.dispatchEvent(new Event(SAVED_EVENT));
    showToast(exists ? t.catalog.unsavedToast : t.catalog.savedToast);
  };

  const addGuestToken = (token: GuestBookingToken) => {
    const next = [token, ...guestTokens.filter((x) => x.booking_code !== token.booking_code)];
    try {
      localStorage.setItem("rentus-my-bookings", JSON.stringify(next));
    } catch {
      // Ignore
    }
    window.dispatchEvent(new Event(TOKENS_EVENT));
  };

  const removeGuestToken = (bookingCode: string) => {
    const next = guestTokens.filter((x) => x.booking_code !== bookingCode);
    try {
      localStorage.setItem("rentus-my-bookings", JSON.stringify(next));
    } catch {
      // Ignore
    }
    window.dispatchEvent(new Event(TOKENS_EVENT));
  };

  const handleBookingCreated = (booking: Booking) => {
    addGuestToken({
      booking_code: booking.booking_code,
      tracking_token: booking.tracking_token,
    });
    refreshStorefront();
  };

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    await refreshStorefront();
    showToast(language === "id" ? "Berhasil keluar dari akun." : "Signed out successfully.");
  };

  const handleOpenListItem = () => {
    const canCreate =
      rbac.authenticated &&
      (rbac.permissions.includes("items:create_own") ||
        rbac.permissions.includes("items:manage_all"));
    if (canCreate) {
      setItemFormOpen(true);
    } else {
      setAuthInitialMode("signup");
      setAuthModalOpen(true);
      showToast(
        language === "id"
          ? "Masuk atau daftar sebagai Mitra / Pemilik Barang untuk menitipkan barang."
          : "Sign in or register as an Item Owner / Partner to list gear."
      );
    }
  };

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const item of items) {
      counts[item.category] = (counts[item.category] || 0) + 1;
    }
    return counts;
  }, [items]);

  const filteredItems = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const list = items.filter((item) => {
      if (activeCategory && item.category !== activeCategory) return false;
      if (sortBy === "available" && item.stock_available <= 0) return false;
      if (!term) return true;
      const haystack = `${item.name} ${item.name_id} ${item.category} ${item.location} ${item.owner_name} ${item.description} ${item.description_id}`.toLowerCase();
      return haystack.includes(term);
    });

    const sorted = [...list];
    if (sortBy === "price-low") sorted.sort((a, b) => a.price_per_day - b.price_per_day);
    else if (sortBy === "price-high") sorted.sort((a, b) => b.price_per_day - a.price_per_day);
    else if (sortBy === "newest")
      sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    else sorted.sort((a, b) => b.popularity_score - a.popularity_score);

    return sorted;
  }, [items, activeCategory, searchTerm, sortBy]);

  const featuredItem = useMemo(() => {
    return (
      items.find((i) => i.slug === "mirrorless-camera-sony") ||
      items[0] ||
      null
    );
  }, [items]);

  const savedItems = useMemo(() => {
    return items.filter((i) => savedIds.includes(i.id));
  }, [items, savedIds]);

  const clearFilters = () => {
    setActiveCategory("");
    setSearchTerm("");
    setSortBy("popular");
  };

  const adminWaSupportUrl = buildWhatsAppUrl(
    settings.admin_whatsapp,
    language === "id"
      ? `Halo ${settings.admin_display_name}, saya ingin bertanya tentang penyewaan barang di ${settings.store_name}.`
      : `Hi ${settings.admin_display_name}, I have a question about renting at ${settings.store_name}.`
  );

  return (
    <div className="flex min-h-screen flex-col overflow-x-clip">
      <Navbar
        storeName={settings.store_name}
        savedCount={savedItems.length}
        myRentalsCount={guestTokens.length}
        rbac={rbac}
        onOpenSaved={() => setSavedModalOpen(true)}
        onOpenMyRentals={() => setRentalsModalOpen(true)}
        onOpenPreferences={() => setPrefsModalOpen(true)}
        onOpenAuth={() => {
          setAuthInitialMode("login");
          setAuthModalOpen(true);
        }}
        onOpenListItem={handleOpenListItem}
        onLogout={handleLogout}
      />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="py-10 sm:py-14">
          <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 sm:px-6 lg:grid-cols-12">
            <div className="lg:col-span-7">
              <div className="inline-flex items-center gap-2 rounded-full bg-[var(--blue-soft)] px-3.5 py-1.5 text-[11px] font-extrabold tracking-wide text-[var(--blue)] uppercase">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                {t.hero.eyebrow}
              </div>

              <h1 className="mt-5 text-3xl leading-[1.08] font-extrabold tracking-tight text-[var(--ink)] sm:text-5xl lg:text-6xl">
                {t.hero.titleStart}{" "}
                <span className="relative inline-block sm:whitespace-nowrap">
                  <span className="relative z-10">{t.hero.titleHighlight}</span>
                  <span
                    aria-hidden="true"
                    className="absolute right-0 bottom-1 left-0 z-0 h-3 -rotate-1 rounded bg-[var(--yellow)]/80"
                  />
                </span>
              </h1>

              <p className="mt-4 max-w-xl text-base leading-relaxed text-[var(--muted)] sm:text-lg">
                {t.hero.copy}
              </p>

              <div className="mt-6 flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:gap-3">
                <a
                  href="#explore"
                  className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-[var(--blue)] px-5 py-2.5 text-center text-sm font-extrabold leading-tight whitespace-nowrap text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[var(--blue-dark)] sm:w-auto"
                >
                  <span>{t.hero.ctaExplore}</span>
                  <ArrowUpRight className="h-4 w-4 shrink-0" />
                </a>
                <button
                  type="button"
                  onClick={() => setRentalsModalOpen(true)}
                  className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-[var(--yellow)] px-5 py-2.5 text-center text-sm font-extrabold leading-tight whitespace-nowrap text-slate-900 transition hover:-translate-y-0.5 hover:brightness-95 sm:w-auto"
                >
                  <Clock className="h-4 w-4 shrink-0" />
                  <span>{t.hero.ctaTrack}</span>
                </button>
                <button
                  type="button"
                  onClick={handleOpenListItem}
                  className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--paper)] px-4 py-2.5 text-center text-sm font-bold leading-tight whitespace-nowrap text-[var(--ink)] transition hover:border-[var(--blue)] sm:w-auto"
                >
                  <span>{t.hero.ctaEarn}</span>
                </button>
              </div>

              <div className="mt-6 flex items-center gap-3 text-xs font-semibold text-[var(--muted)]">
                <div className="flex shrink-0 -space-x-1.5">
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border-2 border-[var(--canvas)] bg-blue-100 text-xs leading-none">
                    🎓
                  </span>
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border-2 border-[var(--canvas)] bg-amber-100 text-xs leading-none">
                    📷
                  </span>
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border-2 border-[var(--canvas)] bg-emerald-100 text-xs leading-none">
                    ⚡
                  </span>
                </div>
                <span className="min-w-0 leading-snug">{t.hero.trust}</span>
              </div>

              {/* Search Bar */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  document.getElementById("catalog-grid")?.scrollIntoView({ behavior: "smooth" });
                }}
                className="mt-6 flex w-full max-w-xl items-center gap-2 rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-2 shadow-sm"
              >
                <Search className="ml-2 h-4 w-4 shrink-0 text-[var(--muted)]" />
                <input
                  type="search"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder={t.hero.searchPlaceholder}
                  aria-label={t.hero.searchBtn}
                  className="min-w-0 flex-1 bg-transparent px-1 py-2 text-sm text-[var(--ink)] outline-none placeholder:text-[var(--muted)]/70"
                />
                <button
                  type="submit"
                  className="inline-flex shrink-0 items-center justify-center rounded-xl bg-[var(--blue)] px-4 py-2.5 text-xs font-extrabold leading-none whitespace-nowrap text-white transition hover:bg-[var(--blue-dark)] sm:text-sm"
                >
                  {t.hero.searchBtn}
                </button>
              </form>
            </div>

            {/* Hero Art Card */}
            <div className="min-w-0 lg:col-span-5">
              <div className="relative flex min-h-[340px] flex-col items-center justify-center gap-4 overflow-hidden rounded-[28px] border border-[var(--line)] bg-gradient-to-br from-[var(--blue-soft)] via-[var(--paper)] to-[var(--yellow-soft)] p-4 sm:min-h-[410px] sm:p-8 sm:py-16">
                <div className="z-10 max-w-full self-start rounded-2xl border border-[var(--line)] bg-[var(--paper)]/95 px-3.5 py-2.5 shadow-md backdrop-blur-xs sm:absolute sm:top-4 sm:left-4 sm:rotate-2">
                  <div className="text-xs font-extrabold text-[var(--ink)]">
                    🎓 {t.hero.tagTopTitle}
                  </div>
                  <div className="text-[11px] text-[var(--muted)]">{t.hero.tagTopSub}</div>
                </div>

                {featuredItem ? (
                  <button
                    type="button"
                    onClick={() => setSelectedItemForBooking(featuredItem)}
                    className="group relative z-0 w-full max-w-[260px] rounded-3xl border border-[var(--line)] bg-[var(--paper)] p-3.5 text-left shadow-xl transition hover:rotate-0 hover:shadow-2xl sm:my-6 sm:-rotate-2"
                  >
                    <div className="relative aspect-[4/3] overflow-hidden rounded-2xl tone-blue">
                      {featuredItem.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={featuredItem.image_url}
                          alt={featuredItem.name}
                          className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-6xl leading-none">
                          {featuredItem.emoji}
                        </div>
                      )}
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-extrabold text-[var(--ink)]">
                          {language === "id" && featuredItem.name_id
                            ? featuredItem.name_id
                            : featuredItem.name}
                        </div>
                        <div className="truncate text-xs text-[var(--muted)]">
                          {featuredItem.location}
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <div className="font-mono-num text-sm font-extrabold text-[var(--blue)]">
                          {formatShortRupiah(featuredItem.price_per_day)}
                        </div>
                        <div className="text-[11px] text-[var(--muted)]">{t.hero.perDay}</div>
                      </div>
                    </div>
                  </button>
                ) : null}

                <div className="z-10 max-w-full self-end rounded-2xl border border-[var(--line)] bg-[var(--paper)]/95 px-3.5 py-2.5 shadow-md backdrop-blur-xs sm:absolute sm:right-4 sm:bottom-4 sm:rotate-2">
                  <div className="text-xs font-extrabold text-[var(--ink)]">
                    ✨ {t.hero.tagBottomTitle}
                  </div>
                  <div className="text-[11px] text-[var(--muted)]">{t.hero.tagBottomSub}</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Categories */}
        <section id="explore" className="py-8 sm:py-10">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
              <div>
                <div className="text-[11px] font-extrabold tracking-widest text-[var(--blue)] uppercase">
                  {t.categories.kicker}
                </div>
                <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-[var(--ink)] sm:text-3xl">
                  {t.categories.heading}
                </h2>
                <p className="mt-1 text-sm text-[var(--muted)]">{t.categories.sub}</p>
              </div>
              {(activeCategory || searchTerm || sortBy !== "popular") ? (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="inline-flex items-center gap-1 text-xs font-extrabold text-[var(--blue)] hover:underline"
                >
                  {t.categories.clearFilters} ↗
                </button>
              ) : null}
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {CATEGORIES.map((cat) => {
                const isActive = activeCategory === cat.id;
                const count = categoryCounts[cat.id] || 0;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setActiveCategory(isActive ? "" : cat.id)}
                    className={`flex flex-col items-center justify-center rounded-2xl border p-3.5 text-center transition hover:-translate-y-0.5 sm:p-4 ${
                      isActive
                        ? "border-[var(--blue)] bg-[var(--blue-soft)] shadow-sm"
                        : "border-[var(--line)] bg-[var(--paper)] hover:border-[var(--blue)]/50"
                    }`}
                  >
                    <div className="mb-2.5 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--surface-subtle)] text-xl leading-none">
                      {cat.emoji}
                    </div>
                    <div className="w-full truncate text-sm font-extrabold text-[var(--ink)]">
                      {t.categories[cat.titleKey]}
                    </div>
                    <div className="mt-0.5 w-full truncate text-[11px] text-[var(--muted)]">
                      {t.categories[cat.subKey]} · <span className="font-mono-num">{count}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* Catalog Grid */}
        <section id="catalog-grid" className="py-6 pb-14">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[11px] font-extrabold tracking-widest text-[var(--blue)] uppercase">
                  {t.catalog.kicker}
                </div>
                <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-[var(--ink)] sm:text-3xl">
                  {activeCategory
                    ? activeCategory
                    : searchTerm
                    ? t.catalog.searchHeading
                    : t.catalog.popularHeading}
                </h2>
                <p className="mt-1 text-sm text-[var(--muted)]">{t.catalog.sub}</p>
              </div>
              <span className="font-mono-num inline-flex shrink-0 items-center justify-center rounded-full bg-[var(--blue-soft)] px-3 py-1.5 text-xs font-extrabold leading-none text-[var(--blue)]">
                {filteredItems.length}{" "}
                {filteredItems.length === 1 ? t.catalog.itemCountSingle : t.catalog.itemCountPlural}
              </span>
            </div>

            {/* Sort Pills */}
            <div className="mb-6 flex flex-wrap gap-2">
              {(
                [
                  { id: "popular", label: `✦ ${t.catalog.sortPopular}` },
                  { id: "price-low", label: t.catalog.sortPriceLow },
                  { id: "price-high", label: t.catalog.sortPriceHigh },
                  { id: "newest", label: t.catalog.sortNewest },
                  { id: "available", label: t.catalog.sortAvailable },
                ] as { id: SortOption; label: string }[]
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setSortBy(opt.id)}
                  className={`inline-flex items-center justify-center rounded-full border px-3.5 py-2 text-xs font-bold leading-none whitespace-nowrap transition ${
                    sortBy === opt.id
                      ? "border-[var(--blue)] bg-[var(--blue-soft)] text-[var(--blue)]"
                      : "border-[var(--line)] bg-[var(--paper)] text-[var(--muted)] hover:text-[var(--ink)]"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Grid */}
            {filteredItems.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-[var(--line)] bg-[var(--paper)] px-6 py-14 text-center">
                <div className="text-3xl">🔎</div>
                <h3 className="mt-2 text-base font-extrabold text-[var(--ink)]">
                  {t.catalog.emptyTitle}
                </h3>
                <p className="mt-1 text-sm text-[var(--muted)]">{t.catalog.emptyCopy}</p>
                <button
                  type="button"
                  onClick={clearFilters}
                  className="mt-4 inline-flex items-center justify-center rounded-xl bg-[var(--blue)] px-4 py-2.5 text-xs font-extrabold leading-none whitespace-nowrap text-white"
                >
                  {t.catalog.resetBtn}
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filteredItems.map((item) => {
                  const isSaved = savedIds.includes(item.id);
                  const title = language === "id" && item.name_id ? item.name_id : item.name;
                  const cond =
                    language === "id" && item.condition_id ? item.condition_id : item.condition;
                  const out = item.stock_available <= 0;

                  return (
                    <article
                      key={item.id}
                      className="group flex min-w-0 flex-col overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--paper)] transition hover:-translate-y-1 hover:shadow-lg"
                    >
                      <div className={`relative h-44 overflow-hidden tone-${item.tone}`}>
                        {item.image_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={item.image_url}
                            alt={title}
                            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-6xl leading-none">
                            {item.emoji}
                          </div>
                        )}

                        <span className="absolute top-3 left-3 inline-flex max-w-[calc(100%-3.5rem)] items-center truncate rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-extrabold leading-none text-slate-800 shadow-xs backdrop-blur-xs">
                          {cond}
                        </span>

                        <button
                          type="button"
                          onClick={() => toggleSave(item.id)}
                          aria-label={t.catalog.saveAria}
                          className={`absolute top-2.5 right-2.5 inline-flex h-8 w-8 items-center justify-center rounded-full leading-none shadow-xs transition ${
                            isSaved
                              ? "bg-white text-rose-500"
                              : "bg-white/85 text-slate-600 hover:bg-white"
                          }`}
                        >
                          <Heart className={`h-4 w-4 ${isSaved ? "fill-rose-500" : ""}`} />
                        </button>

                        <span
                          className={`font-mono-num absolute right-3 bottom-2.5 inline-flex items-center justify-center rounded-full px-2.5 py-1 text-[10px] font-extrabold leading-none whitespace-nowrap shadow-xs ${
                            out
                              ? "bg-rose-600 text-white"
                              : "bg-slate-900/80 text-white backdrop-blur-xs"
                          }`}
                        >
                          {out
                            ? t.catalog.outOfStock
                            : `${item.stock_available} ${t.catalog.unitsLeft}`}
                        </span>
                      </div>

                      <div className="flex flex-1 flex-col p-4">
                        <div className="flex items-center justify-between gap-2 text-[11px] font-extrabold tracking-wider text-[var(--blue)] uppercase">
                          <span className="truncate">{item.category}</span>
                          <span className="font-mono-num shrink-0 whitespace-nowrap text-[var(--muted)]">
                            {t.catalog.upToDays} {item.max_days} {t.catalog.days}
                          </span>
                        </div>

                        <h3 className="mt-1.5 line-clamp-1 text-base font-extrabold text-[var(--ink)]">
                          {title}
                        </h3>

                        <div className="mt-1 flex items-center gap-1 text-xs text-[var(--muted)]">
                          <MapPin className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">{item.location}</span>
                        </div>

                        <div className="mt-auto flex flex-wrap items-center justify-between gap-2.5 border-t border-[var(--line)] pt-3.5">
                          <div className="min-w-0 flex items-baseline gap-1">
                            <span className="font-mono-num text-base font-extrabold text-[var(--ink)]">
                              {formatRupiah(item.price_per_day)}
                            </span>
                            <span className="whitespace-nowrap text-[11px] text-[var(--muted)]">
                              {t.hero.perDay}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => setSelectedItemForBooking(item)}
                            className="inline-flex shrink-0 items-center justify-center gap-1 rounded-xl bg-[var(--blue-soft)] px-3 py-2 text-xs font-extrabold leading-none whitespace-nowrap text-[var(--blue)] transition hover:bg-[var(--blue)] hover:text-white max-[360px]:w-full"
                          >
                            <span>{t.catalog.viewRent} ↗</span>
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* How It Works */}
        <section id="how-it-works" className="border-y border-[var(--line)] bg-[var(--surface-subtle)] py-14">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div>
              <div className="text-[11px] font-extrabold tracking-widest text-[var(--blue)] uppercase">
                {t.how.kicker}
              </div>
              <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-[var(--ink)] sm:text-3xl">
                {t.how.heading}
              </h2>
              <p className="mt-1 text-sm text-[var(--muted)]">{t.how.sub}</p>
            </div>

            <div className="mt-8 grid gap-5 md:grid-cols-3">
              {[
                { num: "01", title: t.how.step1Title, copy: t.how.step1Copy },
                { num: "02", title: t.how.step2Title, copy: t.how.step2Copy },
                { num: "03", title: t.how.step3Title, copy: t.how.step3Copy },
              ].map((step) => (
                <article
                  key={step.num}
                  className="rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-6 shadow-xs"
                >
                  <div className="font-mono-num inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--yellow-soft)] text-sm font-black leading-none text-[var(--warn-ink)]">
                    {step.num}
                  </div>
                  <h3 className="mt-4 text-base font-extrabold text-[var(--ink)]">{step.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-[var(--muted)]">{step.copy}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Community CTA */}
        <section id="community" className="py-14">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="relative overflow-hidden rounded-3xl bg-[var(--blue)] p-6 text-white shadow-lg sm:p-10">
              <div className="relative z-10 flex flex-col items-start justify-between gap-6 lg:flex-row lg:items-center">
                <div className="min-w-0 max-w-xl">
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[11px] font-bold uppercase">
                    <Sparkles className="h-3.5 w-3.5 shrink-0" />
                    <span>{settings.store_name} Partner & Admin Support</span>
                  </div>
                  <h2 className="mt-3 text-2xl font-extrabold tracking-tight sm:text-3xl">
                    {t.cta.title}
                  </h2>
                  <p className="mt-2 text-sm leading-relaxed text-blue-100">{t.cta.copy}</p>
                </div>

                <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:flex-wrap">
                  <button
                    type="button"
                    onClick={handleOpenListItem}
                    className="inline-flex min-h-[44px] w-full items-center justify-center rounded-xl bg-[var(--yellow)] px-5 py-3 text-center text-sm font-extrabold leading-tight whitespace-nowrap text-slate-900 transition hover:brightness-95 sm:w-auto"
                  >
                    ＋ {t.cta.btnPartner}
                  </button>
                  <a
                    href={adminWaSupportUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-white/15 px-5 py-3 text-center text-sm font-bold leading-tight whitespace-nowrap text-white backdrop-blur-xs transition hover:bg-white/25 sm:w-auto"
                  >
                    <MessageCircle className="h-4 w-4 shrink-0" />
                    <span>{t.cta.btnWhatsApp}</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-[var(--line)] bg-[var(--paper)] py-7 text-xs text-[var(--muted)]">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-4 px-4 sm:flex-row sm:items-center sm:px-6">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[var(--blue)] font-black leading-none text-white">
              R.
            </span>
            <div className="min-w-0">
              <div className="font-extrabold text-[var(--ink)]">{settings.store_name}</div>
              <div>{t.footer.tagline}</div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 font-semibold">
            <a href="#explore" className="whitespace-nowrap hover:text-[var(--blue)]">
              {t.nav.explore}
            </a>
            <a href="#how-it-works" className="whitespace-nowrap hover:text-[var(--blue)]">
              {t.nav.howItWorks}
            </a>
            <a
              href={adminWaSupportUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 whitespace-nowrap text-emerald-600 hover:underline dark:text-emerald-400"
            >
              <MessageCircle className="h-3.5 w-3.5 shrink-0" />
              {t.footer.chatAdmin} ({formatWhatsAppDisplay(settings.admin_whatsapp)})
            </a>
            <Link href="/admin" className="whitespace-nowrap hover:text-[var(--blue)]">
              {t.nav.adminConsole}
            </Link>
          </div>
        </div>
      </footer>

      {/* Toast Notification */}
      {toast ? (
        <div className="fixed bottom-5 left-1/2 z-[80] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-2xl bg-slate-900 px-4 py-3 text-center text-xs font-bold text-white shadow-xl">
          {toast}
        </div>
      ) : null}

      {/* Modals */}
      <ItemBookingModal
        item={selectedItemForBooking}
        settings={settings}
        onClose={() => setSelectedItemForBooking(null)}
        onBookingCreated={handleBookingCreated}
        onOpenMyRentals={() => setRentalsModalOpen(true)}
      />

      <MyRentalsModal
        open={rentalsModalOpen}
        settings={settings}
        tokens={guestTokens}
        onClose={() => setRentalsModalOpen(false)}
        onAddToken={addGuestToken}
        onRemoveToken={removeGuestToken}
      />

      <SavedItemsModal
        open={savedModalOpen}
        items={savedItems}
        onClose={() => setSavedModalOpen(false)}
        onRemove={toggleSave}
        onSelectRent={(item) => setSelectedItemForBooking(item)}
      />

      <PreferencesModal open={prefsModalOpen} onClose={() => setPrefsModalOpen(false)} />

      <AuthModal
        open={authModalOpen}
        initialMode={authInitialMode}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={refreshStorefront}
      />

      <ItemFormModal
        open={itemFormOpen}
        item={null}
        onClose={() => setItemFormOpen(false)}
        onSaved={() => {
          refreshStorefront();
          showToast(
            language === "id"
              ? "Barang berhasil ditambahkan ke katalog!"
              : "Item added to catalog!"
          );
        }}
      />
    </div>
  );
}
