import { CreditCard, Mail, Sparkles, Shield, ArrowUpRight } from "lucide-react";
import Link from "next/link";

export function Footer() {
	return (
		<footer className="border-t border-neutral-800/80 bg-black text-white selection:bg-white selection:text-black">
			<div className="mx-auto w-full max-w-[1400px] px-4 pt-12 pb-6 sm:px-6 lg:px-8">
				<div className="grid gap-10 lg:grid-cols-12">
					<div className="lg:col-span-6">
						<Link href="/" className="inline-flex items-center gap-3 text-2xl font-black text-white tracking-[0.2em] uppercase group">
							<div className="relative h-10 w-10 rounded-full overflow-hidden bg-black flex items-center justify-center p-0.5 border border-zinc-800 shadow-[0_0_15px_rgba(255,255,255,0.15)] group-hover:scale-105 transition-transform">
								<img
									src="/official-logo.png"
									alt="ZEBALPHA Logo"
									className="h-full w-full object-cover rounded-full"
								/>
							</div>
							ZEBALPHA
						</Link>
						<p className="mt-4 max-w-md text-sm leading-6 text-neutral-400">
							Clothing crafted for those who move different. Timeless style, elevated in every stitch with 100% premium combed and Supima cottons.
						</p>
						
						<div className="mt-6 flex flex-wrap items-center gap-2.5 text-xs text-neutral-300">
							<span className="rounded-full border border-neutral-800 bg-neutral-900 px-3.5 py-1.5 font-bold uppercase tracking-wider">
								✦ 100% Premium Cotton
							</span>
							<span className="rounded-full border border-neutral-800 bg-neutral-900 px-3.5 py-1.5 font-bold uppercase tracking-wider">
								✦ Relaxed Modern Fits
							</span>
							<span className="rounded-full border border-neutral-800 bg-neutral-900 px-3.5 py-1.5 font-bold uppercase tracking-wider">
								✦ Express Shipping
							</span>
						</div>

						<div className="mt-7 flex items-center gap-3">
							<Link
								href="/products"
								className="inline-flex items-center gap-2 rounded-full bg-white text-black font-black text-xs uppercase tracking-[0.2em] px-6 py-3 hover:bg-neutral-200 transition-all active:scale-95 shadow-lg"
							>
								<span>Shop The Drop</span>
								<ArrowUpRight className="h-4 w-4" />
							</Link>
						</div>
					</div>

					<div className="hidden lg:block lg:col-span-3">
						<h3 className="text-xs font-black uppercase tracking-[0.25em] text-white">Collections</h3>
						<ul className="mt-5 space-y-3.5 text-sm text-neutral-400 font-medium">
							<li><Link href="/products?category=Polos" className="transition hover:text-white">Premium Zip Polos</Link></li>
							<li><Link href="/products?category=T-Shirts" className="transition hover:text-white">Oversized Streetwear Tees</Link></li>
							<li><Link href="/products?category=Hoodies" className="transition hover:text-white">Heavyweight Hoodies</Link></li>
							<li><Link href="/products?category=Shirts" className="transition hover:text-white">Casual Collared Shirts</Link></li>
							<li><Link href="/products" className="transition hover:text-white">New Releases 2026</Link></li>
						</ul>
					</div>

					<div className="hidden lg:block lg:col-span-3">
						<h3 className="text-xs font-black uppercase tracking-[0.25em] text-white">Customer Support</h3>
						<ul className="mt-5 space-y-3.5 text-sm text-neutral-400 font-medium">
							<li><Link href="/wishlist" className="transition hover:text-white">Your Wishlist</Link></li>
							<li><Link href="/profile/orders" className="transition hover:text-white">Track Your Order</Link></li>
							<li><Link href="/about" className="transition hover:text-white">About Zebalpha</Link></li>
							<li><Link href="/contact" className="transition hover:text-white">Contact Us</Link></li>
							<li><Link href="/privacy-policy" className="transition hover:text-white">Privacy Policy</Link></li>
						</ul>
					</div>
				</div>

				<div className="mt-10 border-t border-neutral-800/80 pt-6 pb-2 text-xs text-neutral-500 sm:flex sm:items-center sm:justify-between">
					<p>© 2026 ZEBALPHA APPAREL. All rights reserved. Clothing for the culture.</p>
					<div className="mt-4 flex items-center gap-2 sm:mt-0">
						<Mail className="h-4 w-4 text-neutral-400" />
						<Link href="mailto:support@zebalpha.com" className="transition hover:text-white font-medium">
							support@zebalpha.com
						</Link>
					</div>
				</div>
			</div>
		</footer>
	);
}
