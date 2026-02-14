import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CBAM Threshold Tracker",
  description:
    "Deterministic CBAM scope detection and 50-tonne threshold tracking for brokers and EU importers."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
