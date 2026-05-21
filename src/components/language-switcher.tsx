"use client";

import { useState, useRef, useEffect } from "react";
import { Globe } from "lucide-react";
import { useLanguage, languageNames, type Language } from "@/contexts/language-context";

const languages: Language[] = ["en", "si", "ta"];

export function LanguageSwitcher({ collapsed = false }: { collapsed?: boolean }) {
  const { language, setLanguage, t } = useLanguage();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative px-2 pb-1">
      <button
        onClick={() => setOpen((v) => !v)}
        title={t.settings.language}
        className={`flex items-center gap-2 w-full rounded-xl text-sm font-medium text-surface-500 hover:bg-surface-100 hover:text-surface-800 transition-all ${
          collapsed ? "justify-center px-0 py-2.5" : "px-3 py-2"
        }`}
      >
        <Globe size={18} className="text-surface-400 shrink-0" />
        {!collapsed && (
          <span className="truncate">
            {languageNames[language]}
          </span>
        )}
      </button>

      {open && (
        <div
          className={`absolute z-50 bottom-full mb-1 bg-white border border-surface-200 rounded-xl shadow-lg overflow-hidden min-w-[140px] ${
            collapsed ? "left-full ml-2 bottom-0" : "left-2 right-2"
          }`}
        >
          <p className="px-3 py-2 text-[10px] uppercase tracking-wide text-surface-400 font-semibold border-b border-surface-100">
            {t.settings.selectLanguage}
          </p>
          {languages.map((lang) => (
            <button
              key={lang}
              onClick={() => { setLanguage(lang); setOpen(false); }}
              className={`w-full text-left px-3 py-2.5 text-sm font-medium transition-colors ${
                language === lang
                  ? "bg-brand-50 text-brand-700"
                  : "text-surface-600 hover:bg-surface-50 hover:text-surface-800"
              }`}
            >
              {languageNames[lang]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
