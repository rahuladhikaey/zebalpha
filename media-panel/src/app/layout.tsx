import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ZebAlpha Media & Marketing Panel",
  description: "Enterprise Media, Content Strategy, and Marketing Campaigns",
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

