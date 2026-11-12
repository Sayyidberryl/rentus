"use client";

import React, { createContext, useContext, useEffect, useSyncExternalStore } from "react";
import { dictionary } from "@/lib/i18n";
import type { Language, Theme } from "@/types/rental";

interface PreferencesContextValue {
  theme: Theme;
  language: Language;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  t: (typeof dictionary)["en"] | (typeof dictionary)["id"];
}

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

const PREFS_EVENT = "rentus-prefs-updated";

function subscribePrefs(cb: () => void) {
  window.addEventListener(PREFS_EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(PREFS_EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}

function getThemeSnapshot(): Theme {
  try {
    return localStorage.getItem("rentus-theme") === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
}

function getLanguageSnapshot(): Language {
  try {
    return localStorage.getItem("rentus-language") === "en" ? "en" : "id";
  } catch {
    return "id";
  }
}

export function PreferencesProvider({ children }: { children: React.ReactNode }) {
  const theme = useSyncExternalStore<Theme>(
    subscribePrefs,
    getThemeSnapshot,
    () => "light"
  );
  const language = useSyncExternalStore<Language>(
    subscribePrefs,
    getLanguageSnapshot,
    () => "id"
  );

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.lang = language;
  }, [theme, language]);

  const setTheme = (next: Theme) => {
    try {
      localStorage.setItem("rentus-theme", next);
    } catch {
      // Ignore
    }
    document.documentElement.dataset.theme = next;
    window.dispatchEvent(new Event(PREFS_EVENT));
  };

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  const setLanguage = (next: Language) => {
    try {
      localStorage.setItem("rentus-language", next);
    } catch {
      // Ignore
    }
    document.documentElement.lang = next;
    window.dispatchEvent(new Event(PREFS_EVENT));
  };

  const toggleLanguage = () => {
    setLanguage(language === "id" ? "en" : "id");
  };

  return (
    <PreferencesContext.Provider
      value={{
        theme,
        language,
        setTheme,
        toggleTheme,
        setLanguage,
        toggleLanguage,
        t: dictionary[language],
      }}
    >
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences() {
  const ctx = useContext(PreferencesContext);
  if (!ctx) {
    throw new Error("usePreferences must be used within PreferencesProvider");
  }
  return ctx;
}
