"use client";

import React from "react";
import { Heart, Trash2, X } from "lucide-react";
import { usePreferences } from "@/components/PreferencesProvider";
import { formatRupiah } from "@/lib/format";
import type { RentalItem } from "@/types/rental";

interface SavedItemsModalProps {
  open: boolean;
  items: RentalItem[];
  onClose: () => void;
  onRemove: (id: number) => void;
  onSelectRent: (item: RentalItem) => void;
}

export function SavedItemsModal({
  open,
  items,
  onClose,
  onRemove,
  onSelectRent,
}: SavedItemsModalProps) {
  const { language, t } = usePreferences();
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-[var(--line)] bg-[var(--paper)] p-5 shadow-2xl sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-3 border-b border-[var(--line)] pb-4">
          <div className="min-w-0">
            <h3 className="flex items-center gap-2 text-lg font-extrabold text-[var(--ink)]">
              <Heart className="h-5 w-5 shrink-0 text-rose-500" />
              <span>{t.savedModal.title}</span>
            </h3>
            <p className="mt-0.5 text-xs text-[var(--muted)]">{t.savedModal.subtitle}</p>
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

        {items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[var(--line)] py-10 text-center text-sm text-[var(--muted)]">
            {t.savedModal.empty}
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item) => {
              const title = language === "id" && item.name_id ? item.name_id : item.name;
              return (
                <div
                  key={item.id}
                  className="flex flex-col justify-between gap-3 rounded-2xl border border-[var(--line)] bg-[var(--surface-subtle)] p-3 sm:flex-row sm:items-center"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div
                      className={`h-14 w-14 shrink-0 overflow-hidden rounded-xl tone-${item.tone}`}
                    >
                      {item.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={item.image_url}
                          alt={title}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-2xl leading-none">
                          {item.emoji}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-extrabold text-[var(--ink)]">{title}</div>
                      <div className="font-mono-num text-xs font-bold text-[var(--blue)]">
                        {formatRupiah(item.price_per_day)} {t.hero.perDay}
                      </div>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2 sm:justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onSelectRent(item);
                      }}
                      className="inline-flex flex-1 items-center justify-center rounded-xl bg-[var(--blue)] px-3.5 py-2 text-xs font-bold leading-none whitespace-nowrap text-white hover:bg-[var(--blue-dark)] sm:flex-initial"
                    >
                      {t.savedModal.rentNow}
                    </button>
                    <button
                      type="button"
                      onClick={() => onRemove(item.id)}
                      aria-label={t.savedModal.remove}
                      className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-[var(--line)] bg-[var(--paper)] leading-none text-[var(--muted)] hover:text-rose-500"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

