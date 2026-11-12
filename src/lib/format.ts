import type { Language } from "@/types/rental";

export function formatRupiah(amount: number | string | null | undefined): string {
  const num = Number(amount ?? 0);
  if (!Number.isFinite(num)) return "Rp0";
  return "Rp" + Math.round(num).toLocaleString("id-ID");
}

export function formatShortRupiah(amount: number): string {
  if (amount >= 1_000_000) {
    const val = amount / 1_000_000;
    return `Rp${Number.isInteger(val) ? val : val.toFixed(1)}jt`;
  }
  if (amount >= 1000) {
    const val = amount / 1000;
    return `Rp${Number.isInteger(val) ? val : val.toFixed(0)}rb`;
  }
  return formatRupiah(amount);
}

export function formatDateTime(iso: string | number, lang: Language = "id"): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString(lang === "id" ? "id-ID" : "en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatRemaining(dueIso: string, lang: Language = "id", nowMs = Date.now()): {
  overdue: boolean;
  label: string;
} {
  const diff = new Date(dueIso).getTime() - nowMs;
  if (diff <= 0) {
    const lateSec = Math.floor(Math.abs(diff) / 1000);
    const d = Math.floor(lateSec / 86400);
    const h = Math.floor((lateSec % 86400) / 3600);
    const m = Math.floor((lateSec % 3600) / 60);
    return {
      overdue: true,
      label:
        lang === "id"
          ? `Melewati batas ${d > 0 ? `${d}h ` : ""}${h}j ${m}m — segera hubungi Admin`
          : `Overdue by ${d > 0 ? `${d}d ` : ""}${h}h ${m}m — contact Admin`,
    };
  }

  const totalSec = Math.floor(diff / 1000);
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;

  return {
    overdue: false,
    label:
      lang === "id"
        ? `${days}h ${hours}j ${minutes}m ${seconds}d tersisa`
        : `${days}d ${hours}h ${minutes}m ${seconds}s remaining`,
  };
}

export function normalizeWhatsAppDigits(raw: string): string {
  let digits = String(raw || "").replace(/[^0-9]/g, "");
  if (digits.startsWith("0")) {
    digits = "62" + digits.slice(1);
  }
  return digits;
}

export function formatWhatsAppDisplay(raw: string): string {
  const digits = normalizeWhatsAppDigits(raw);
  if (!digits) return "-";
  if (digits.startsWith("62")) {
    return "+" + digits.replace(/^62(\d{3})(\d{4})(\d+)/, "62 $1-$2-$3");
  }
  return "+" + digits;
}

export function buildWhatsAppUrl(phone: string, message: string): string {
  const digits = normalizeWhatsAppDigits(phone);
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

export function slugify(text: string): string {
  return (
    text
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) +
    "-" +
    Math.random().toString(36).slice(2, 6)
  );
}

