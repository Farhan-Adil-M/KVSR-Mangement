import type { Metadata, Viewport } from "next";
import { Inter, Fraunces } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";

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

export const metadata: Metadata = {
  title: "KVSR Management",
  description: "Dr. K.V. Subba Reddy Institute of Technology - College Management System",
  keywords: ["KVSRIT", "college management", "attendance", "timetable", "Kurnool"],
  authors: [{ name: "KVSR IT Department" }],
};

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
