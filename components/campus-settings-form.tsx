"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateCampusSettings } from "@/lib/actions/campus-settings";

interface CampusSettingsFormProps {
  initial: {
    latitude: number;
    longitude: number;
    radiusMeters: number;
    name?: string | null;
  };
}

export function CampusSettingsForm({ initial }: CampusSettingsFormProps) {
  const router = useRouter();
  const [latitude, setLatitude] = useState(String(initial.latitude));
  const [longitude, setLongitude] = useState(String(initial.longitude));
  const [radiusMeters, setRadiusMeters] = useState(String(initial.radiusMeters));
  const [status, setStatus] = useState<{
    kind: "success" | "error";
    text: string;
  } | null>(null);
  const [isPending, setIsPending] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStatus(null);
    setIsPending(true);
    void (async () => {
      try {
        const res = await updateCampusSettings({
          latitude: Number(latitude),
          longitude: Number(longitude),
          radiusMeters: Number(radiusMeters),
        });
        if (res.success) {
          setStatus({ kind: "success", text: "Campus location saved." });
          router.refresh();
        } else {
          setStatus({ kind: "error", text: res.error });
        }
      } catch {
        setStatus({ kind: "error", text: "Failed to save campus location." });
      } finally {
        setIsPending(false);
      }
    })();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-sm text-slate-700">
        Used to verify that attendance is marked from inside campus. Students
        and faculty outside this radius are blocked from marking attendance.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label
            htmlFor="campus-latitude"
            className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2"
          >
            Latitude
          </label>
          <input
            id="campus-latitude"
            type="number"
            step="any"
            min={-90}
            max={90}
            value={latitude}
            onChange={(e) => setLatitude(e.target.value)}
            required
            className="w-full bg-white border border-kvsr-soft rounded-xl px-3 py-2.5 text-sm text-kvsr-ink shadow-sm focus:outline-none focus:ring-2 focus:ring-kvsr-gold"
          />
        </div>

        <div>
          <label
            htmlFor="campus-longitude"
            className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2"
          >
            Longitude
          </label>
          <input
            id="campus-longitude"
            type="number"
            step="any"
            min={-180}
            max={180}
            value={longitude}
            onChange={(e) => setLongitude(e.target.value)}
            required
            className="w-full bg-white border border-kvsr-soft rounded-xl px-3 py-2.5 text-sm text-kvsr-ink shadow-sm focus:outline-none focus:ring-2 focus:ring-kvsr-gold"
          />
        </div>

        <div>
          <label
            htmlFor="campus-radius"
            className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2"
          >
            Radius (meters)
          </label>
          <input
            id="campus-radius"
            type="number"
            step="1"
            min={10}
            max={5000}
            value={radiusMeters}
            onChange={(e) => setRadiusMeters(e.target.value)}
            required
            className="w-full bg-white border border-kvsr-soft rounded-xl px-3 py-2.5 text-sm text-kvsr-ink shadow-sm focus:outline-none focus:ring-2 focus:ring-kvsr-gold"
          />
        </div>
      </div>

      {status && (
        <p
          role="status"
          className={`text-sm ${
            status.kind === "success" ? "text-emerald-600" : "text-destructive"
          }`}
        >
          {status.text}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="px-5 py-2.5 bg-kvsr-navy text-white text-sm font-medium rounded-xl hover:bg-kvsr-navy/90 disabled:opacity-50"
      >
        {isPending ? "Saving…" : "Save"}
      </button>
    </form>
  );
}
