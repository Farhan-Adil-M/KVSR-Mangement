"use client";

import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";

interface UpdateInfo {
  version: string;
  apkUrl: string;
}

/**
 * Self-hosted update checker. Runs only inside the native Capacitor app
 * (skips on the plain web), reads the installed version via the App plugin,
 * and compares it against /app-version.json. When a newer APK is available
 * it shows a banner that opens the download page.
 */
export function UpdateChecker() {
  const [update, setUpdate] = useState<UpdateInfo | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { Capacitor } = await import("@capacitor/core");
        if (!Capacitor.isNativePlatform()) return;

        const { App } = await import("@capacitor/app");
        const info = await App.getInfo();
        const installedCode = Number(info.build ?? 0);

        const res = await fetch("/app-version.json", { cache: "no-store" });
        if (!res.ok) return;
        const manifest = await res.json();
        const latestCode = Number(manifest.versionCode ?? 0);

        if (latestCode > installedCode && manifest.apkUrl) {
          if (!cancelled) {
            setUpdate({ version: manifest.version ?? "new", apkUrl: manifest.apkUrl });
          }
        }
      } catch {
        // Best-effort: silently ignore failures (e.g. old APK without the plugin).
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!update || dismissed) return null;

  async function openDownload() {
    try {
      const { Browser } = await import("@capacitor/browser");
      await Browser.open({ url: update!.apkUrl });
    } catch {
      window.open(update!.apkUrl, "_blank", "noopener");
    }
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-md">
      <div className="flex items-center gap-3 rounded-2xl border border-kvsr-soft bg-white p-4 shadow-lg">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-kvsr-ink">
            A new version ({update.version}) is available
          </p>
          <p className="text-xs text-slate-700 mt-0.5">
            Download the latest update to get new features and fixes.
          </p>
        </div>
        <button
          type="button"
          onClick={openDownload}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-kvsr-cta text-white text-sm font-semibold hover:bg-kvsr-cta/90 transition-colors shrink-0"
        >
          <Download className="w-4 h-4" />
          Update
        </button>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label="Dismiss update notice"
          className="p-2 rounded-lg text-slate-700 hover:bg-kvsr-navy/[0.06] shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
