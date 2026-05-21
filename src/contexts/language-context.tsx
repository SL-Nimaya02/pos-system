"use client";

import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import en, { type Translations } from "@/lib/i18n/en";
import si from "@/lib/i18n/si";
import ta from "@/lib/i18n/ta";

export type Language = "en" | "si" | "ta";

const STORAGE_KEY = "pos_language";

const translations: Record<Language, Translations> = { en, si, ta };

export const languageNames: Record<Language, string> = {
  en: "English",
  si: "සිංහල",
  ta: "தமிழ்",
};

interface LanguageContextValue {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: Translations;
}

const LanguageContext = createContext<LanguageContextValue>({
  language: "en",
  setLanguage: () => {},
  t: en,
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>("en");

  // Load persisted language on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as Language | null;
    if (stored && stored in translations) {
      setLanguageState(stored);
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem(STORAGE_KEY, lang);
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t: translations[language] }}>
      {children}
    </LanguageContext.Provider>
  );
}

/** Hook to access translations and language switcher anywhere in the app. */
export function useLanguage() {
  return useContext(LanguageContext);
}
