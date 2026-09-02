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
export const metadata = {
	title: "Super Admin Portal | ZEB-ALPHA",
	description: "Master Management Dashboard for ZEB-ALPHA Platform",
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
			className={`${geistMono.variable} ${outfit.variable} h-full antialiased dark`}
		>
			<body className="min-h-full font-sans overflow-x-hidden bg-[#050505] text-white" suppressHydrationWarning>
				<ThemeSync />
				{children}
			</body>
		</html>
	);
}
