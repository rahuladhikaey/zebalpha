import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ZebAlpha Internal Operations Panel",
  description: "Enterprise Order Fulfillment, Support Desk, Logistics, and Fleet Operations",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-dark-950 text-zinc-100 min-h-screen">
        {children}
      </body>
    </html>
  );
}

