import type { Metadata } from "next";
import { Geist_Mono, Outfit } from "next/font/google";
import "./globals.css";
import { ThemeSync } from "@/components/ThemeSync";

const outfit = Outfit({
	subsets: ["latin"],
	variable: "--font-outfit",
	display: "swap",
});
const geistMono = Geist_Mono({
	variable: "--font-geist-mono",
	subsets: ["latin"],
});

export const metadata: Metadata = {
	title: "Sell Online on ZebAlpha | 0% Commission Seller Hub",
	description:
		"Become a ZebAlpha seller and sell online across India at 0% commission, zero penalty charges, fast 7-day bank payouts, and 28,000+ serviceable pincodes.",
	metadataBase: new URL("https://seller.zebalpha.shop"),
	openGraph: {
		title: "Sell Online on ZebAlpha | 0% Commission Seller Hub",
		description:
			"Grow your apparel & fashion business across India on ZebAlpha with 0% commission, Pan-India shipping, and easy GST / Non-GST onboarding.",
		url: "https://seller.zebalpha.shop",
		siteName: "ZebAlpha Seller Hub",
		locale: "en_IN",
		type: "website",
		images: [{ url: "/official-logo.png", width: 512, height: 512, alt: "ZebAlpha Seller Hub" }],
	},
	icons: {
		icon: "/official-logo.png",
		shortcut: "/official-logo.png",
		apple: "/official-logo.png",
	},
};

export default function RootLayout({
	children,
}: Readonly<{
		children: React.ReactNode;
	}>) {
	return (
		<html
			lang="en"
			suppressHydrationWarning
			className={`${geistMono.variable} ${outfit.variable} h-full antialiased light`}
		>
			<body className="min-h-full font-sans overflow-x-hidden bg-white text-[#14120F]" suppressHydrationWarning>
				<ThemeSync />
				{children}
			</body>
		</html>
	);
}
