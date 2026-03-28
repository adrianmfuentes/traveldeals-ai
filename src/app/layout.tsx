import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TravelDeals AI",
  description: "Monitor flights and hotels with AI. Get alerts for the best travel deals.",
};

// html and body are rendered by app/[locale]/layout.tsx, which has access to
// the locale param and sets <html lang={locale}> correctly (next-intl pattern).
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children as unknown as React.ReactElement;
}
