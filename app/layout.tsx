import type { Metadata, Viewport } from "next";
import { Inter, Fraunces } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { getAppConfig } from "@/lib/app-config";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  axes: ["opsz", "SOFT", "WONK"],
  display: "swap",
});

// Institution identity from app config (§8.4) — no hardcoded name here.
export async function generateMetadata(): Promise<Metadata> {
  const config = await getAppConfig();
  return {
    title: `${config.institutionShortName} Management`,
    description: `${config.institutionName} - College Management System`,
    keywords: [
      config.institutionShortName,
      "college management",
      "attendance",
      "timetable",
      "Kurnool",
    ],
    authors: [{ name: `${config.institutionShortName} IT Department` }],
  };
}

export const viewport: Viewport = {
  themeColor: "#021B43",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={cn("font-sans", inter.variable, fraunces.variable)}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
