import { CreditCard, Mail } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { ThemeToggle } from "./ThemeToggle";

export function Footer() {
	return (
		<footer className="border-t border-slate-200 bg-slate-950 text-slate-100">
			<div className="mx-auto w-full max-w-[1400px] px-4 pt-8 pb-4 sm:px-6 lg:px-8">
				<div className="grid gap-10 lg:grid-cols-12">
					<div className="lg:col-span-6">
						<Link href="/" className="inline-flex items-center gap-3 text-xl font-bold text-white">
							<span className="relative h-12 w-12 overflow-hidden rounded-full bg-white p-1">
								<Image src="/official-logo.png" alt="Asali Swad logo" fill className="object-contain p-1" />
							</span>
							Asali Swad
						</Link>
						<p className="mt-4 max-w-sm text-sm leading-6 text-slate-300">
							A fresh and reliable grocery experience for your neighborhood. Fast delivery, secure payments, and an easy shopping flow tailored for everyday essentials.
						</p>
						<div className="mt-7 flex flex-wrap items-center gap-3 text-xs text-slate-400 sm:text-sm">
							<span className="rounded-full border border-slate-700 bg-slate-900/80 px-3 py-2">Fresh produce</span>
							<span className="rounded-full border border-slate-700 bg-slate-900/80 px-3 py-2">Quick orders</span>
							<span className="rounded-full border border-slate-700 bg-slate-900/80 px-3 py-2">Secure checkout</span>
						</div>

						<div className="mt-8 flex justify-center lg:justify-start">
							<Link
								href="/profile"
								className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 !text-white font-bold text-xs uppercase tracking-wider px-6 py-3 transition-all border-b-[4px] border-emerald-700 hover:bg-emerald-400 hover:border-emerald-600 active:translate-y-[2px] active:border-b-[2px] shadow-md shadow-emerald-950/40 select-none cursor-pointer w-auto"
								style={{ color: '#ffffff' }}
							>
								<CreditCard className="h-6 w-6" strokeWidth={2.5}/>
								Apply As-Card
							</Link>
						</div>
					</div>

					<div className="hidden lg:block lg:col-span-3">
						<h3 className="text-sm font-semibold uppercase tracking-[0.24em] text-yellow-300">Quick Access</h3>
						<ul className="mt-5 space-y-4 text-sm text-slate-300">
							<li><Link href="/" className="transition hover:text-white">Store Home</Link></li>
							<li><Link href="/products" className="transition hover:text-white">All Products</Link></li>
							<li><Link href="/cart" className="transition hover:text-white">Your Cart</Link></li>
							<li><Link href="/checkout" className="transition hover:text-white">Checkout</Link></li>
							<li><Link href="/profile/orders" className="transition hover:text-white">Track Order</Link></li>
						</ul>
					</div>

					<div className="hidden lg:block lg:col-span-3">
						<h3 className="text-sm font-semibold uppercase tracking-[0.24em] text-yellow-300">Customer Care</h3>
						<ul className="mt-5 space-y-4 text-sm text-slate-300">
							<li><Link href="/wishlist" className="transition hover:text-white">Wishlist</Link></li>
							<li><Link href="/about" className="transition hover:text-white">About Us</Link></li>
							<li><Link href="/contact" className="transition hover:text-white">Contact & Support</Link></li>
							<li><Link href="/privacy-policy" className="transition hover:text-white">Privacy Policy</Link></li>
							<li><Link href="/terms-and-conditions" className="transition hover:text-white">Terms & Conditions</Link></li>
							<li><ThemeToggle /></li>
						</ul>
					</div>
				</div>

				<div className="mt-6 border-t border-slate-800 pt-6 pb-4 text-sm text-slate-500 sm:flex sm:items-center sm:justify-between">
					<p>© 2026 Asali Swad. All rights reserved.</p>
					<div className="mt-4 flex flex-wrap gap-2 sm:mt-0">
						<Mail className="h-4 w-4 md:h-5 md:w-5 " strokeWidth={2}/>
						<Link href="mailto:mail@asaliswad.com" className="transition hover:text-white">mail@asaliswad.com</Link>
					</div>
				</div>
			</div>
		</footer>
	);
}
