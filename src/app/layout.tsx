import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CycleOps",
  description: "Tactical Endurance Event Manager",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}