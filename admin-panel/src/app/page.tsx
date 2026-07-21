"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Logo from "@/assets/images/official-logo.png";
import Image from "next/image";
import BG from "@/assets/svgs/bg.svg";
import BGDark from "@/assets/svgs/bg-dark.svg";
import { DarkModeToggle } from "@/components/DarkModeToggle";
import { useThemeStore } from "@/store/theme";

export default function AdminLoginPage() {
	const dark = useThemeStore((state) => state.dark);
	const router = useRouter();
	const [username, setUsername] = useState("");
	const [password, setPassword] = useState("");
	const [authError, setAuthError] = useState("");
	const [loading, setLoading] = useState(false);

	const handleAccessSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		setAuthError("");
		setLoading(true);

		try {
			const res = await fetch("/api/admin/login", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ 
					username: username.trim(), 
					password: password 
				}),
			});
			const data = await res.json();
			if (res.ok && data.success) {
				// Use window.location.href instead of router.push to bypass Next.js client-side cache
				// which might have cached the previous redirect from /admin to /admin/login
				window.location.href = "/dashboard";
			} else {
				setAuthError(data.message || "Incorrect admin keys.");
			}
		} catch (error) {
			setAuthError("Server error. Please try again.");
		}
		setLoading(false);
	};

	return (
		<main className="relative min-h-screen flex items-center justify-center p-4 text-slate-900 overflow-hidden">
			<>
				<BG
					className={`fixed inset-0 w-screen h-screen -z-10 transition-opacity duration-500 ${
						dark ? "opacity-0" : "opacity-100"
					}`}
					preserveAspectRatio="xMidYMid slice"
				/>
				<BGDark
					className={`fixed inset-0 w-screen h-screen -z-10 transition-opacity duration-500 ${
						dark ? "opacity-100" : "opacity-0"
					}`}
					preserveAspectRatio="xMidYMid slice"
				/>
			</>
			<div className="absolute top-10 right-10" >
				<DarkModeToggle/>
			</div>
			<section className="w-full max-w-lg">
				<div className="rounded-[3rem] bg-foreground/[0.15] p-10 backdrop-blur-xl md:p-14 premium-shadow flex flex-col items-center">
					<div className="mb-10 transition-transform hover:scale-110 duration-500">
						<a href="https://asaliswad.com">
							<Image
								src={Logo}
								alt="Asali Swad Admin"
								className="h-24 w-24 rounded-[50%] object-cover shadow-2xl border-4 border-white"
							/>
						</a>
					</div>

					<div className="text-center mb-8 md:mb-10">
						<span className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.4em] text-primary">
							Secure Entry
						</span>
						<h1 className="mt-2 text-2xl md:text-3xl font-black tracking-tight text-foreground">
							Admin Panel
						</h1>
						<p className="mt-2 md:mt-3 text-[11px] md:text-sm font-bold text-text-secondary">
							Exclusive access for spice masters.
						</p>
					</div>

					<form className="w-full space-y-6" onSubmit={handleAccessSubmit}>
						<div className="space-y-4">
							<div className="group relative">
								<span className="absolute left-6 top-1/2 -translate-y-1/2 text-[10px] font-black uppercase text-text-muted group-focus-within:text-primary transition-colors duration-150">
									Username
								</span>
								<input
									type="text"
									required
									value={username}
									onChange={(event) => setUsername(event.target.value)}
									placeholder="••••••••"
									className="w-full rounded-2xl border-2 border-slate-50 bg-slate-50 pl-25 pr-6 py-4 text-sm font-bold outline-none transition-all placeholder:text-text-disabled focus:border-emerald-500/20 focus:bg-white focus:ring-4 focus:ring-emerald-500/5"
								/>
							</div>
							<div className="group relative">
								<span className="absolute left-6 top-1/2 -translate-y-1/2 text-[10px] font-black uppercase text-text-muted group-focus-within:text-primary transition-colors duration-150">
									Password
								</span>
								<input
									type="password"
									required
									value={password}
									onChange={(event) => setPassword(event.target.value)}
									placeholder="••••••••"
									className="w-full rounded-2xl border-2 border-slate-50 bg-slate-50 pl-25 pr-6 py-4 text-sm font-bold outline-none transition-all placeholder:text-text-disabled focus:border-emerald-500/20 focus:bg-white focus:ring-4 focus:ring-emerald-500/5"
								/>
							</div>
						</div>

						{authError ? (
							<div className="flex items-center gap-3 rounded-2xl bg-rose-50 p-4 border border-rose-100/50">
								<p className="text-xs font-bold text-rose-700 leading-snug">
									{authError}
								</p>
							</div>
						) : null}

						<button
							type="submit"
							disabled={loading}
							className="flex h-14 w-full items-center justify-center rounded-2xl bg-primary text-sm font-black uppercase tracking-widest text-white shadow-xl shadow-emerald-600/30 transition-all duration-300 hover:opacity-[0.75] active:scale-95 disabled:opacity-50"
						>
							{loading ? "Authenticating..." : "Authenticate Access"}
						</button>


					</form>

					<div className="mt-8 text-center">
						<a
							href="https://asaliswad.com"
							className="text-[10px] font-black uppercase tracking-[0.25em] text-text-muted hover:text-primary transition-colors duration-300"
						>
							Return to Public Store
						</a>
					</div>

				</div>
			</section>
		</main>
	);
}
