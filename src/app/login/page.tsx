"use client";

import React, { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Info, KeyRound, Languages, Moon, ShieldCheck, Sun } from "lucide-react";
import { usePreferences } from "@/components/PreferencesProvider";
import { createClient } from "@/lib/supabase/client";

function LoginFormInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") || "/admin";
  const { theme, language, toggleTheme, toggleLanguage, t } = usePreferences();

  const [mode, setMode] = useState<"login" | "signup">("login");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);

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
        router.push(nextPath);
        router.refresh();
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: { full_name: fullName.trim(), phone: phone.trim() },
          },
        });
        if (error) throw error;
        if (!data.session) {
          setInfoMsg(
            language === "id"
              ? "Pendaftaran berhasil! Silakan verifikasi email atau minta Admin mengaktifkan akun Anda."
              : "Registration successful! Please confirm your email or ask Admin to activate your account."
          );
        } else {
          router.push("/dashboard");
          router.refresh();
        }
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--canvas)] px-4 py-8">
      <div className="mx-auto mb-8 flex max-w-md items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm font-bold text-[var(--muted)] hover:text-[var(--blue)]"
        >
          <ArrowLeft className="h-4 w-4" />
          {t.admin.backToStore}
        </Link>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={toggleLanguage}
            className="inline-flex h-8 items-center gap-1 rounded-xl border border-[var(--line)] bg-[var(--paper)] px-2.5 text-xs font-bold text-[var(--ink)]"
          >
            <Languages className="h-3.5 w-3.5 text-[var(--blue)]" />
            {language.toUpperCase()}
          </button>
          <button
            type="button"
            onClick={toggleTheme}
            className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)]"
          >
            {theme === "dark" ? (
              <Sun className="h-4 w-4 text-amber-400" />
            ) : (
              <Moon className="h-4 w-4 text-[var(--blue)]" />
            )}
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-md rounded-3xl border border-[var(--line)] bg-[var(--paper)] p-5 shadow-xl sm:p-8">
        <div className="mb-5 flex items-center gap-3">
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--blue)] text-base font-black leading-none text-white">
            R.
          </span>
          <div className="min-w-0">
            <h1 className="text-xl font-extrabold text-[var(--ink)]">
              {mode === "login" ? t.auth.titleLogin : t.auth.titleSignup}
            </h1>
            <p className="text-xs text-[var(--muted)]">
              {mode === "login" ? t.auth.subtitleLogin : t.auth.subtitleSignup}
            </p>
          </div>
        </div>

        <div className="mb-4 flex items-start gap-2 rounded-2xl bg-[var(--blue-soft)] p-3 text-xs text-[var(--ink)]">
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
            {loading ? "..." : mode === "login" ? t.auth.loginBtn : t.auth.signupBtn}
          </button>
        </form>

        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={() => setMode(mode === "login" ? "signup" : "login")}
            className="text-xs font-bold text-[var(--blue)] hover:underline"
          >
            {mode === "login" ? t.auth.switchToSignup : t.auth.switchToLogin}
          </button>
        </div>

        <details className="mt-5 rounded-2xl border border-[var(--line)] bg-[var(--surface-subtle)] p-3 text-xs">
          <summary className="flex cursor-pointer items-center gap-2 font-extrabold text-[var(--ink)]">
            <KeyRound className="h-3.5 w-3.5 text-[var(--blue)]" />
            {t.auth.demoTitle}
          </summary>
          <p className="mt-2 text-[11px] text-[var(--muted)]">{t.auth.demoHint}</p>
          <div className="mt-2.5 grid gap-1.5">
            {[
              { role: "Admin", email: "admin@rentus.id", pass: "RentUsAdmin2026!", icon: true },
              { role: "Staff Operator", email: "staff@rentus.id", pass: "RentUsStaff2026!", icon: false },
              { role: "Owner / Mitra", email: "owner@rentus.id", pass: "RentUsOwner2026!", icon: false },
            ].map((acc) => (
              <button
                key={acc.email}
                type="button"
                onClick={() => {
                  setMode("login");
                  setEmail(acc.email);
                  setPassword(acc.pass);
                }}
                className="flex items-center justify-between gap-2 rounded-xl border border-[var(--line)] bg-[var(--paper)] px-3 py-2 text-left hover:border-[var(--blue)]"
              >
                <span className="flex shrink-0 items-center gap-1.5 font-bold text-[var(--ink)]">
                  {acc.icon ? <ShieldCheck className="h-3.5 w-3.5 text-amber-500" /> : null}
                  {acc.role}
                </span>
                <span className="font-mono-num min-w-0 truncate text-[11px] text-[var(--muted)]">
                  {acc.email}
                </span>
              </button>
            ))}
          </div>
        </details>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[var(--canvas)]" />}>
      <LoginFormInner />
    </Suspense>
  );
}

