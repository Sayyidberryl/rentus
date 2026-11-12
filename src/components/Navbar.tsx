"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Clock,
  Heart,
  Languages,
  LogOut,
  Menu,
  Moon,
  Plus,
  Settings,
  ShieldCheck,
  Store,
  Sun,
  UserCheck,
  X,
} from "lucide-react";
import { usePreferences } from "@/components/PreferencesProvider";
import { getRoleLabel } from "@/lib/i18n";
import type { RbacContext } from "@/types/rental";

interface NavbarProps {
  storeName?: string;
  savedCount: number;
  myRentalsCount: number;
  rbac: RbacContext;
  onOpenSaved: () => void;
  onOpenMyRentals: () => void;
  onOpenPreferences: () => void;
  onOpenAuth: () => void;
  onOpenListItem: () => void;
  onLogout: () => void;
}

export function Navbar({
  storeName = "RentUs",
  savedCount,
  myRentalsCount,
  rbac,
  onOpenSaved,
  onOpenMyRentals,
  onOpenPreferences,
  onOpenAuth,
  onOpenListItem,
  onLogout,
}: NavbarProps) {
  const { theme, language, toggleTheme, toggleLanguage, t } = usePreferences();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isAdminOrStaff = rbac.authenticated && (rbac.role === "admin" || rbac.role === "staff");
  const isOwner = rbac.authenticated && rbac.role === "owner";

  return (
    <header className="sticky top-0 z-30 border-b border-[var(--line)] bg-[var(--paper)]/92 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-2 px-3 sm:h-[74px] sm:gap-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-6">
          <Link
            href="/"
            className="flex min-w-0 items-center gap-2 text-lg font-extrabold tracking-tight sm:gap-2.5 sm:text-xl"
          >
            <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[var(--blue)] text-sm font-black leading-none text-white shadow-sm sm:h-9 sm:w-9 sm:text-base">
              R.
            </span>
            <span className="truncate text-[var(--blue)]">{storeName}</span>
          </Link>

          <nav className="hidden items-center gap-6 text-sm font-semibold text-[var(--muted)] lg:flex">
            <a href="#explore" className="whitespace-nowrap transition hover:text-[var(--blue)]">
              {t.nav.explore}
            </a>
            <a href="#how-it-works" className="whitespace-nowrap transition hover:text-[var(--blue)]">
              {t.nav.howItWorks}
            </a>
            <a href="#community" className="whitespace-nowrap transition hover:text-[var(--blue)]">
              {t.nav.community}
            </a>
          </nav>
        </div>

        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          {/* Quick Language Toggle Pill */}
          <button
            type="button"
            onClick={toggleLanguage}
            title={language === "id" ? "Switch to English" : "Ganti ke Bahasa Indonesia"}
            className="inline-flex h-8 shrink-0 items-center justify-center gap-1 rounded-xl border border-[var(--line)] bg-[var(--surface-subtle)] px-2 text-[11px] font-bold leading-none whitespace-nowrap text-[var(--ink)] transition hover:border-[var(--blue)] sm:h-9 sm:gap-1.5 sm:px-2.5 sm:text-xs"
          >
            <Languages className="h-3.5 w-3.5 shrink-0 text-[var(--blue)]" />
            <span>{language.toUpperCase()}</span>
          </button>

          {/* Quick Light / Dark Toggle Pill */}
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={theme === "dark" ? t.prefs.light : t.prefs.dark}
            title={theme === "dark" ? t.prefs.light : t.prefs.dark}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-[var(--line)] bg-[var(--surface-subtle)] leading-none text-[var(--ink)] transition hover:border-[var(--blue)] sm:h-9 sm:w-9"
          >
            {theme === "dark" ? (
              <Sun className="h-4 w-4 text-amber-400" />
            ) : (
              <Moon className="h-4 w-4 text-[var(--blue)]" />
            )}
          </button>

          {/* Preferences Modal Button */}
          <button
            type="button"
            onClick={onOpenPreferences}
            aria-label={t.nav.settings}
            className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-bold leading-none text-[var(--muted)] transition hover:bg-[var(--blue-soft)] hover:text-[var(--ink)] md:inline-flex"
          >
            <Settings className="h-4 w-4" />
          </button>

          {/* Saved Favourites */}
          <button
            type="button"
            onClick={onOpenSaved}
            aria-label={t.nav.saved}
            className="relative inline-flex h-8 shrink-0 items-center justify-center gap-1 rounded-xl px-2 text-xs font-bold leading-none whitespace-nowrap text-[var(--ink)] transition hover:bg-[var(--blue-soft)] sm:h-9 sm:gap-1.5 sm:px-2.5 sm:text-sm"
          >
            <Heart className="h-4 w-4 shrink-0 text-rose-500" />
            <span className="hidden md:inline">{t.nav.saved}</span>
            <span className="font-mono-num inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[var(--blue-soft)] px-1.5 text-[11px] font-bold leading-none text-[var(--blue)]">
              {savedCount}
            </span>
          </button>

          {/* Zero-Login My Rentals */}
          <button
            type="button"
            onClick={onOpenMyRentals}
            aria-label={t.nav.myRentals}
            className="inline-flex h-8 shrink-0 items-center justify-center gap-1 rounded-xl border border-[var(--line)] bg-[var(--paper)] px-2 text-xs font-bold leading-none whitespace-nowrap text-[var(--ink)] transition hover:border-[var(--blue)] hover:bg-[var(--blue-soft)] sm:h-9 sm:gap-1.5 sm:px-3 sm:text-sm"
          >
            <Clock className="h-3.5 w-3.5 shrink-0 text-[var(--blue)]" />
            <span className="hidden sm:inline">{t.nav.myRentals}</span>
            {myRentalsCount > 0 ? (
              <span className="font-mono-num inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[var(--blue)] px-1.5 text-[10px] font-bold leading-none text-white">
                {myRentalsCount}
              </span>
            ) : null}
          </button>

          {/* Desktop Role-Aware Auth / Dashboard / Admin Buttons */}
          {rbac.authenticated ? (
            <div className="hidden items-center gap-1.5 md:flex">
              {isAdminOrStaff ? (
                <Link
                  href="/admin"
                  className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-[var(--yellow-soft)] px-3 text-xs font-extrabold leading-none whitespace-nowrap text-[var(--warn-ink)] transition hover:opacity-90"
                >
                  <ShieldCheck className="h-4 w-4 shrink-0" />
                  <span>{rbac.role === "admin" ? t.nav.adminConsole : t.nav.staffConsole}</span>
                </Link>
              ) : null}

              {isOwner || isAdminOrStaff ? (
                <Link
                  href="/dashboard"
                  className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-[var(--blue-soft)] px-3 text-xs font-bold leading-none whitespace-nowrap text-[var(--blue)] transition hover:opacity-90"
                >
                  <Store className="h-3.5 w-3.5 shrink-0" />
                  <span>{t.nav.dashboard}</span>
                </Link>
              ) : null}

              <button
                type="button"
                onClick={onLogout}
                title={`${rbac.profile?.full_name || rbac.profile?.email} (${getRoleLabel(rbac.role, language)}) — ${t.nav.logout}`}
                className="inline-flex h-9 shrink-0 items-center justify-center gap-1 rounded-xl px-2.5 text-xs font-bold leading-none whitespace-nowrap text-[var(--muted)] transition hover:bg-rose-500/10 hover:text-rose-500"
              >
                <LogOut className="h-3.5 w-3.5 shrink-0" />
                <span className="hidden xl:inline">{t.nav.logout}</span>
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={onOpenAuth}
              className="hidden h-9 shrink-0 items-center justify-center gap-1.5 rounded-xl px-3 text-xs font-bold leading-none whitespace-nowrap text-[var(--muted)] transition hover:bg-[var(--blue-soft)] hover:text-[var(--ink)] md:inline-flex"
            >
              <UserCheck className="h-3.5 w-3.5 shrink-0" />
              <span>{t.nav.login}</span>
            </button>
          )}

          {/* Desktop List an Item CTA */}
          <button
            type="button"
            onClick={onOpenListItem}
            className="hidden h-9 shrink-0 items-center justify-center gap-1 rounded-xl bg-[var(--blue)] px-3.5 text-xs font-extrabold leading-none whitespace-nowrap text-white shadow-sm transition hover:bg-[var(--blue-dark)] sm:inline-flex sm:text-sm"
          >
            <Plus className="h-4 w-4 shrink-0" />
            <span>{t.nav.listItem}</span>
          </button>

          {/* Mobile Drawer Trigger */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileMenuOpen}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-[var(--line)] bg-[var(--surface-subtle)] leading-none text-[var(--ink)] transition hover:border-[var(--blue)] sm:h-9 sm:w-9 lg:hidden"
          >
            {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen ? (
        <div className="border-t border-[var(--line)] bg-[var(--paper)] px-4 py-4 shadow-lg lg:hidden">
          <div className="mx-auto flex max-w-6xl flex-col gap-3">
            <nav className="grid grid-cols-3 gap-2 text-center text-xs font-bold">
              <a
                href="#explore"
                onClick={() => setMobileMenuOpen(false)}
                className="inline-flex items-center justify-center rounded-xl border border-[var(--line)] bg-[var(--surface-subtle)] px-2 py-2.5 text-[var(--ink)]"
              >
                {t.nav.explore}
              </a>
              <a
                href="#how-it-works"
                onClick={() => setMobileMenuOpen(false)}
                className="inline-flex items-center justify-center rounded-xl border border-[var(--line)] bg-[var(--surface-subtle)] px-2 py-2.5 text-[var(--ink)]"
              >
                {t.nav.howItWorks}
              </a>
              <a
                href="#community"
                onClick={() => setMobileMenuOpen(false)}
                className="inline-flex items-center justify-center rounded-xl border border-[var(--line)] bg-[var(--surface-subtle)] px-2 py-2.5 text-[var(--ink)]"
              >
                {t.nav.community}
              </a>
            </nav>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenMyRentals();
                }}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-[var(--line)] bg-[var(--surface-subtle)] px-3 py-2.5 text-xs font-extrabold text-[var(--ink)]"
              >
                <Clock className="h-3.5 w-3.5 shrink-0 text-[var(--blue)]" />
                <span>{t.nav.myRentals}</span>
                <span className="font-mono-num inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[var(--blue)] px-1.5 text-[10px] font-bold leading-none text-white">
                  {myRentalsCount}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenPreferences();
                }}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-[var(--line)] bg-[var(--surface-subtle)] px-3 py-2.5 text-xs font-bold text-[var(--ink)]"
              >
                <Settings className="h-3.5 w-3.5 shrink-0 text-[var(--blue)]" />
                <span>{t.nav.settings}</span>
              </button>
            </div>

            {rbac.authenticated ? (
              <div className="flex flex-col gap-2">
                <div className="grid gap-2 sm:grid-cols-2">
                  {isAdminOrStaff ? (
                    <Link
                      href="/admin"
                      onClick={() => setMobileMenuOpen(false)}
                      className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[var(--yellow-soft)] px-3 py-2.5 text-xs font-extrabold text-[var(--warn-ink)]"
                    >
                      <ShieldCheck className="h-4 w-4 shrink-0" />
                      <span>{rbac.role === "admin" ? t.nav.adminConsole : t.nav.staffConsole}</span>
                    </Link>
                  ) : null}

                  {isOwner || isAdminOrStaff ? (
                    <Link
                      href="/dashboard"
                      onClick={() => setMobileMenuOpen(false)}
                      className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[var(--blue-soft)] px-3 py-2.5 text-xs font-bold text-[var(--blue)]"
                    >
                      <Store className="h-3.5 w-3.5 shrink-0" />
                      <span>{t.nav.dashboard}</span>
                    </Link>
                  ) : null}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onLogout();
                  }}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-rose-500/25 bg-[var(--danger-bg)] px-3 py-2.5 text-xs font-bold text-[var(--danger-ink)]"
                >
                  <LogOut className="h-3.5 w-3.5 shrink-0" />
                  <span>
                    {t.nav.logout} ({getRoleLabel(rbac.role, language)})
                  </span>
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenAuth();
                }}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-[var(--line)] bg-[var(--surface-subtle)] px-3 py-2.5 text-xs font-bold text-[var(--ink)]"
              >
                <UserCheck className="h-3.5 w-3.5 shrink-0 text-[var(--blue)]" />
                <span>{t.nav.login}</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenListItem();
              }}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[var(--blue)] px-4 py-3 text-xs font-extrabold text-white shadow-sm sm:hidden"
            >
              <Plus className="h-4 w-4 shrink-0" />
              <span>{t.nav.listItem}</span>
            </button>
          </div>
        </div>
      ) : null}
    </header>
  );
}

