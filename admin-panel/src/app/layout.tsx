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
	title: "Admin Panel",
	description: "Asali Swad Admin Panel",
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
			className={`${geistMono.variable} ${outfit.variable} h-full antialiased`}
		>
			<head>
				<script
					dangerouslySetInnerHTML={{
						__html: `
							try {
								const stored = JSON.parse(localStorage.getItem('theme-storage'));
								if (stored?.state?.dark) document.documentElement.classList.add('dark');
							} catch (e) {}
						`,
					}}
				/>
			</head>
			<body className="min-h-full font-sans overflow-x-hidden">
				<ThemeSync />
				{children}
			</body>
		</html>
	);
}
