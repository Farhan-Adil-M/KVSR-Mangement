import { NextResponse } from "next/server";

/**
 * Digital Asset Links for Trusted Web Activity (APK) verification.
 * Set ANDROID_ASSETLINKS to a JSON array, e.g.:
 *   [{"relation":["delegate_permission/common.handle_all_urls"],"target":{"namespace":"android_app","package_name":"com.kvsr.mgmt","sha256_cert_fingerprints":["<SHA256>"]}}]
 * If unset, an empty list is served (TWA still installs/sideloads but runs in a
 * browser wrapper rather than fullscreen trusted mode).
 */
export function GET() {
  const raw = process.env.ANDROID_ASSETLINKS;
  let links: unknown = [];
  if (raw) {
    try {
      links = JSON.parse(raw);
    } catch {
      links = [];
    }
  }
  return NextResponse.json(links, {
    headers: { "Content-Type": "application/json" },
  });
}
