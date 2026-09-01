import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.kvsr.mgmt",
  appName: "KVSR Management",
  webDir: "public",
  server: {
    // The Next.js app is server-rendered, so the native shell loads the
    // deployed web app over HTTPS and bridges native camera/geolocation.
    url: "https://kvsr-mangement-tau.vercel.app",
    androidScheme: "https",
    cleartext: false,
  },
};

export default config;
