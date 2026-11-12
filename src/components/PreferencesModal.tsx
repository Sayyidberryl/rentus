"use client";

import React from "react";
import { Globe, Moon, Sun, X } from "lucide-react";
import { usePreferences } from "@/components/PreferencesProvider";
import type { Language, Theme } from "@/types/rental";

interface PreferencesModalProps {
  open: boolean;
  onClose: () => void;
}

export function PreferencesModal({ open, onClose }: PreferencesModalProps) {
  const { theme, language, setTheme, setLanguage, t } = usePreferences();

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h3 className="text-lg font-extrabold text-[var(--ink)]">{t.prefs.title}</h3>
            <p className="text-xs text-[var(--muted)]">{t.prefs.subtitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--surface-subtle)] text-[var(--muted)] hover:text-[var(--ink)]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 border-t border-[var(--line)] pt-4">
          <div className="flex items-center justify-between gap-3">
            <label
              htmlFor="pref-theme"
              className="flex items-center gap-2 text-sm font-bold text-[var(--ink)]"
            >
              {theme === "dark" ? (
                <Moon className="h-4 w-4 text-[var(--blue)]" />
              ) : (
                <Sun className="h-4 w-4 text-amber-500" />
              )}
              {t.prefs.display}
            </label>
            <select
              id="pref-theme"
              value={theme}
              onChange={(e) => setTheme(e.target.value as Theme)}
              className="rounded-xl border border-[var(--line)] bg-[var(--surface-subtle)] px-3 py-2 text-sm font-semibold text-[var(--ink)] outline-none focus:border-[var(--blue)]"
            >
              <option value="light">{t.prefs.light}</option>
              <option value="dark">{t.prefs.dark}</option>
            </select>
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-[var(--line)] pt-4">
            <label
              htmlFor="pref-lang"
              className="flex items-center gap-2 text-sm font-bold text-[var(--ink)]"
            >
              <Globe className="h-4 w-4 text-[var(--blue)]" />
              {t.prefs.language}
            </label>
            <select
              id="pref-lang"
              value={language}
              onChange={(e) => setLanguage(e.target.value as Language)}
              className="rounded-xl border border-[var(--line)] bg-[var(--surface-subtle)] px-3 py-2 text-sm font-semibold text-[var(--ink)] outline-none focus:border-[var(--blue)]"
            >
              <option value="id">Bahasa Indonesia</option>
              <option value="en">English</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}

