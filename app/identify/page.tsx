import { IdentifyClient } from "@/components/identify-client";
import { getAppConfig } from "@/lib/app-config";

/**
 * Thin server wrapper (spec §8.4 / Q6 option a): loads config server-side and
 * hands the fullscreen face sign-in client only the two values it needs.
 * The page itself stays out of the (portal) shell — fullscreen camera.
 */
export default async function IdentifyPage() {
  const config = await getAppConfig();

  return (
    <IdentifyClient
      identifyScanIntervalMs={config.identifyScanIntervalMs}
      institutionShortName={config.institutionShortName}
    />
  );
}
