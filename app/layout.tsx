import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Benni-Tagebuch",
  description: "Ein privates, sicheres digitales Tagebuch — für die Ewigkeit gebaut.",
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  themeColor: "#15121A",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  );
}
