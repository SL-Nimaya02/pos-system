"use client";

import { useEffect, useState } from "react";

/** Non-standard browser event — not in the default TypeScript lib */
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  prompt(): Promise<void>;
  readonly userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/**
 * Shows a bottom banner on mobile/tablet suggesting the user add the app to
 * their home screen. The banner appears only when the browser fires the
 * beforeinstallprompt event (Chrome/Edge on Android, some desktop Chrome).
 * On iOS Safari users see a plain instruction message since iOS does not
 * support the beforeinstallprompt API.
 *
 * Also registers the service worker on mount.
 */
export function PwaInstallPrompt() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIos, setIsIos]               = useState(false);
  const [dismissed, setDismissed]       = useState(false);

  useEffect(() => {
    // Register service worker
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
        // SW registration failure is non-fatal
      });
    }

    // Detect iOS (no beforeinstallprompt, but still installable via Share → Add)
    const ua = navigator.userAgent;
    const ios = /iphone|ipad|ipod/i.test(ua) && !(window as Window & { MSStream?: unknown }).MSStream;
    const inStandaloneMode = (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
    if (ios && !inStandaloneMode) setIsIos(true);

    // Capture Chrome/Android install prompt
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  // Don't show if already dismissed or already installed
  if (dismissed) return null;

  // iOS instructions banner
  if (isIos) {
    return (
      <div className="fixed bottom-4 left-4 right-4 z-50 rounded-xl bg-indigo-600 p-4 text-white shadow-lg md:left-auto md:right-6 md:w-96">
        <div className="flex items-start gap-3">
          <span className="text-2xl" aria-hidden>📲</span>
          <div className="flex-1">
            <p className="font-semibold">Install POS App</p>
            <p className="mt-1 text-sm text-indigo-100">
              Tap the <strong>Share</strong> button{" "}
              <span aria-hidden>⬆</span> then{" "}
              <strong>Add to Home Screen</strong> for quick offline access.
            </p>
          </div>
          <button
            onClick={() => setDismissed(true)}
            aria-label="Dismiss"
            className="shrink-0 text-indigo-200 hover:text-white text-xl leading-none"
          >
            ×
          </button>
        </div>
      </div>
    );
  }

  // Chrome/Android prompt banner
  if (!installPrompt) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 rounded-xl bg-indigo-600 p-4 text-white shadow-lg md:left-auto md:right-6 md:w-96">
      <div className="flex items-start gap-3">
        <span className="text-2xl" aria-hidden>🏪</span>
        <div className="flex-1">
          <p className="font-semibold">Install POS App</p>
          <p className="mt-1 text-sm text-indigo-100">
            Add to your home screen for quick access — works even when offline.
          </p>
        </div>
        <button
          onClick={() => setDismissed(true)}
          aria-label="Dismiss"
          className="shrink-0 text-indigo-200 hover:text-white text-xl leading-none"
        >
          ×
        </button>
      </div>
      <div className="mt-3 flex gap-2">
        <button
          className="flex-1 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-50 active:scale-95 transition"
          onClick={async () => {
            await installPrompt.prompt();
            const { outcome } = await installPrompt.userChoice;
            if (outcome === "accepted" || outcome === "dismissed") {
              setDismissed(true);
            }
          }}
        >
          Install
        </button>
        <button
          className="rounded-lg px-4 py-2 text-sm text-indigo-200 hover:text-white"
          onClick={() => setDismissed(true)}
        >
          Not now
        </button>
      </div>
    </div>
  );
}
