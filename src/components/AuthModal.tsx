"use client";

import React, { useState } from "react";
import { Info, X } from "lucide-react";
import { usePreferences } from "@/components/PreferencesProvider";
import { createClient } from "@/lib/supabase/client";

interface AuthModalProps {
  open: boolean;
  initialMode?: "login" | "signup";
  onClose: () => void;
  onSuccess: () => void;
}

export function AuthModal({
  open,
  initialMode = "login",
  onClose,
  onSuccess,
}: AuthModalProps) {
  const { language, t } = usePreferences();
  const [mode, setMode] = useState<"login" | "signup">(initialMode);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setInfoMsg(null);

    try {
      const supabase = createClient();
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
        onSuccess();
        onClose();
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              full_name: fullName.trim(),
              phone: phone.trim(),
            },
          },
        });
        if (error) throw error;
        if (!data.session) {
          setInfoMsg(
            language === "id"
              ? "Akun Mitra terdaftar! Silakan cek email verifikasi atau hubungi Admin untuk aktivasi."
              : "Partner account registered! Please check your confirmation email or ask Admin to activate."
          );
        } else {
          onSuccess();
          onClose();
        }
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 p-4 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-3xl border border-[var(--line)] bg-[var(--paper)] p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-extrabold text-[var(--ink)]">
              {mode === "login" ? t.auth.titleLogin : t.auth.titleSignup}
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-[var(--muted)]">
              {mode === "login" ? t.auth.subtitleLogin : t.auth.subtitleSignup}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[var(--surface-subtle)] text-[var(--muted)] hover:text-[var(--ink)]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mb-4 flex items-start gap-2.5 rounded-2xl border border-[var(--blue)]/25 bg-[var(--blue-soft)] p-3 text-xs leading-relaxed text-[var(--ink)]">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-[var(--blue)]" />
          <span>{t.auth.guestCallout}</span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {mode === "signup" ? (
            <>
              <div>
                <label className="mb-1 block text-xs font-bold text-[var(--ink)]">
                  {t.auth.fullName}
                </label>
                <input
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface-subtle)] px-3 py-2.5 text-sm text-[var(--ink)] outline-none focus:border-[var(--blue)]"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-[var(--ink)]">
                  {t.auth.phone}
                </label>
                <input
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="081234567890"
                  className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface-subtle)] px-3 py-2.5 text-sm text-[var(--ink)] outline-none focus:border-[var(--blue)]"
                />
              </div>
            </>
          ) : null}

          <div>
            <label className="mb-1 block text-xs font-bold text-[var(--ink)]">
              {t.auth.email}
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@domain.com"
              className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface-subtle)] px-3 py-2.5 text-sm text-[var(--ink)] outline-none focus:border-[var(--blue)]"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold text-[var(--ink)]">
              {t.auth.password}
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface-subtle)] px-3 py-2.5 text-sm text-[var(--ink)] outline-none focus:border-[var(--blue)]"
            />
          </div>

          {errorMsg ? (
            <div className="rounded-xl bg-[var(--danger-bg)] px-3 py-2.5 text-xs font-bold text-[var(--danger-ink)]">
              {errorMsg}
            </div>
          ) : null}

          {infoMsg ? (
            <div className="rounded-xl bg-[var(--success-bg)] px-3 py-2.5 text-xs font-bold text-[var(--success-ink)]">
              {infoMsg}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-[var(--blue)] px-4 py-3 text-sm font-extrabold text-white transition hover:bg-[var(--blue-dark)] disabled:opacity-50"
          >
            {loading
              ? "..."
              : mode === "login"
              ? t.auth.loginBtn
              : t.auth.signupBtn}
          </button>
        </form>

        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={() => {
              setMode(mode === "login" ? "signup" : "login");
              setErrorMsg(null);
              setInfoMsg(null);
            }}
            className="text-xs font-bold text-[var(--blue)] hover:underline"
          >
            {mode === "login" ? t.auth.switchToSignup : t.auth.switchToLogin}
          </button>
        </div>
      </div>
    </div>
  );
}

