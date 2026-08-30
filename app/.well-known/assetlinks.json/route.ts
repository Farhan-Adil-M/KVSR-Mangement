import { NextResponse } from "next/server";

/**
 * Digital Asset Links for Trusted Web Activity (APK) verification.
 *
 * Chrome only opens the app as a fullscreen Trusted Web Activity when this file
 * proves the app (package_name) is allowed to handle the site's URLs. The
 * sha256_cert_fingerprints must match the certificate used to SIGN the APK.
 *
 * Defaults to the KVSR release keystore. Override by setting ANDROID_ASSETLINKS
 * to a JSON array (same shape) in the environment.
 */
const DEFAULT_ASSETLINKS = [
  {
    relation: ["delegate_permission/common.handle_all_urls"],
    target: {
      namespace: "android_app",
      package_name: "com.kvsr.mgmt",
      sha256_cert_fingerprints: [
        "4E:45:5B:E2:DB:D3:70:CA:99:58:BB:62:61:64:BB:AD:EC:FC:3F:56:98:F1:4B:21:6B:1F:35:C3:B3:EA:5C:27",
      ],
    },
  },
];

export function GET() {
  const raw = process.env.ANDROID_ASSETLINKS;
  let links: unknown = DEFAULT_ASSETLINKS;
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) links = parsed;
    } catch {
      links = DEFAULT_ASSETLINKS;
    }
  }
  return NextResponse.json(links, {
    headers: { "Content-Type": "application/json" },
  });
}
