"use client";

import { useState, useEffect, type FormEvent } from "react";
import Logo from "@/assets/images/official-logo.png";
import Image from "next/image";
import { ShieldCheck, Lock, KeyRound, AlertCircle, Eye, EyeOff } from "lucide-react";

export default function AdminLoginPage() {
	const [adminKey1, setAdminKey1] = useState("");
	const [adminKey2, setAdminKey2] = useState("");
	const [showKey1, setShowKey1] = useState(false);
	const [showKey2, setShowKey2] = useState(false);
	const [authError, setAuthError] = useState("");
	const [loading, setLoading] = useState(false);
	const [isAutoChecking, setIsAutoChecking] = useState(true);

	// Auto-login: If keys are cached in browser, authenticate automatically
	useEffect(() => {
		if (typeof window === "undefined") return;

		const cachedKey1 = localStorage.getItem("zebalpha_admin_saved_key1");
		const cachedKey2 = localStorage.getItem("zebalpha_admin_saved_key2");

		if (cachedKey1 && cachedKey2) {
			setAdminKey1(cachedKey1);
			setAdminKey2(cachedKey2);
			setLoading(true);

			fetch("/api/admin/login", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ 
					adminKey1: cachedKey1.trim(), 
					adminKey2: cachedKey2.trim() 
				}),
			})
				.then((res) => res.json())
				.then((data) => {
					if (data.success) {
						if (data.token) {
							localStorage.setItem("zebalpha_access_token", data.token);
							localStorage.setItem("admin_token", data.token);
						}
						window.location.href = "/dashboard";
					} else {
						// Saved keys no longer valid, clear them
						localStorage.removeItem("zebalpha_admin_saved_key1");
						localStorage.removeItem("zebalpha_admin_saved_key2");
						setLoading(false);
						setIsAutoChecking(false);
					}
				})
				.catch(() => {
					setLoading(false);
					setIsAutoChecking(false);
				});
		} else {
			setIsAutoChecking(false);
		}
	}, []);

	const handleAccessSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		setAuthError("");
		setLoading(true);

		try {
			const res = await fetch("/api/admin/login", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ 
					adminKey1: adminKey1.trim(), 
					adminKey2: adminKey2.trim() 
				}),
			});
			const data = await res.json();
			if (res.ok && data.success) {
				if (data.token) {
					localStorage.setItem("zebalpha_access_token", data.token);
					localStorage.setItem("admin_token", data.token);
				}
				// Save keys in browser cache for future auto-login
				localStorage.setItem("zebalpha_admin_saved_key1", adminKey1.trim());
				localStorage.setItem("zebalpha_admin_saved_key2", adminKey2.trim());

				window.location.href = "/dashboard";
			} else {
				setAuthError(data.message || "Invalid administrative security factors.");
			}
		} catch (error) {
			setAuthError("Server communication error. Please try again.");
		} finally {
			setLoading(false);
		}
	};

	if (isAutoChecking) {
		return (
			<main className="min-h-screen flex items-center justify-center p-4 bg-black text-white">
				<div className="rounded-3xl bg-zinc-950 border border-zinc-800 p-8 shadow-2xl flex flex-col items-center max-w-sm w-full text-center">
					<div className="relative mb-4">
						<Image
							src={Logo}
							alt="ZEB-ALPHA Super Admin"
							className="h-14 w-14 rounded-full object-cover border border-zinc-700 shadow-md animate-pulse"
						/>
						<span className="absolute -bottom-1 -right-1 bg-emerald-500 text-black rounded-full p-1 border-2 border-black">
							<ShieldCheck size={12} className="stroke-[3]" />
						</span>
					</div>
					<h2 className="text-sm font-black tracking-tight text-white mb-1">
						Authenticating Admin Session...
					</h2>
					<p className="text-[11px] text-zinc-400 font-medium">
						Verifying cached security factors.
					</p>
				</div>
			</main>
		);
	}

	return (
		<main className="min-h-screen flex items-center justify-center p-4 bg-black text-white">
			<section className="w-full max-w-md">
				<div className="rounded-3xl bg-zinc-950 border border-zinc-800 p-8 shadow-2xl flex flex-col items-center">
					<div className="mb-5 relative">
						<a href="http://localhost:3000">
							<Image
								src={Logo}
								alt="ZEB-ALPHA Super Admin"
								className="h-16 w-16 rounded-full object-cover border border-zinc-700 shadow-md hover:scale-105 transition-transform"
							/>
						</a>
						<span className="absolute -bottom-1 -right-1 bg-emerald-500 text-black rounded-full p-1 border-2 border-black">
							<ShieldCheck size={12} className="stroke-[3]" />
						</span>
					</div>

					<div className="text-center mb-6">
						<span className="text-[10px] font-black uppercase tracking-[0.25em] text-emerald-400">
							Two-Factor Protected
						</span>
						<h1 className="mt-1 text-2xl font-black tracking-tight text-white">
							Admin Security Portal
						</h1>
						<p className="mt-1.5 text-xs text-zinc-400 font-medium">
							Access requires verification of two independent security factors.
						</p>
					</div>

					<form className="w-full space-y-4" onSubmit={handleAccessSubmit} autoComplete="off">
						<div className="space-y-3.5">
							<div className="space-y-1 text-left">
								<label className="flex items-center gap-1.5 text-xs font-bold text-zinc-300">
									<KeyRound size={13} className="text-zinc-400" />
									Security Factor 1 (Primary Key)
								</label>
								<div className="relative">
									<input
										type={showKey1 ? "text" : "password"}
										required
										autoComplete="off"
										value={adminKey1}
										onChange={(event) => setAdminKey1(event.target.value)}
										placeholder="Enter primary administrative key"
										className="w-full rounded-2xl border border-zinc-800 bg-zinc-900/90 px-4 py-3 text-sm font-mono text-white outline-none placeholder:text-zinc-500 placeholder:font-sans focus:border-white focus:bg-zinc-900 transition-all pr-11"
									/>
									<button
										type="button"
										onClick={() => setShowKey1(!showKey1)}
										className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white transition-colors p-1"
										tabIndex={-1}
									>
										{showKey1 ? <EyeOff size={16} /> : <Eye size={16} />}
									</button>
								</div>
							</div>

							<div className="space-y-1 text-left">
								<label className="flex items-center gap-1.5 text-xs font-bold text-zinc-300">
									<Lock size={13} className="text-zinc-400" />
									Security Factor 2 (Secondary Passcode)
								</label>
								<div className="relative">
									<input
										type={showKey2 ? "text" : "password"}
										required
										autoComplete="off"
										value={adminKey2}
										onChange={(event) => setAdminKey2(event.target.value)}
										placeholder="Enter secondary security key"
										className="w-full rounded-2xl border border-zinc-800 bg-zinc-900/90 px-4 py-3 text-sm font-mono text-white outline-none placeholder:text-zinc-500 placeholder:font-sans focus:border-white focus:bg-zinc-900 transition-all pr-11"
									/>
									<button
										type="button"
										onClick={() => setShowKey2(!showKey2)}
										className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white transition-colors p-1"
										tabIndex={-1}
									>
										{showKey2 ? <EyeOff size={16} /> : <Eye size={16} />}
									</button>
								</div>
							</div>
						</div>

						{authError ? (
							<div className="p-3.5 rounded-2xl bg-rose-950/60 border border-rose-800/80 text-xs font-semibold text-rose-300 flex items-start gap-2">
								<AlertCircle size={15} className="shrink-0 mt-0.5" />
								<span>{authError}</span>
							</div>
						) : null}

						<button
							type="submit"
							disabled={loading}
							className="w-full py-3.5 rounded-2xl bg-white hover:bg-zinc-200 text-black text-sm font-black uppercase tracking-wider transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer shadow-lg shadow-white/10 mt-2"
						>
							{loading ? "Verifying Factors..." : "Authenticate & Enter"}
						</button>
					</form>

					<div className="mt-6 text-center border-t border-zinc-800/80 pt-4 w-full">
						<a
							href="http://localhost:3000"
							className="text-xs font-medium text-zinc-400 hover:text-white transition-colors"
						>
							← Return to Storefront
						</a>
					</div>
				</div>
			</section>
		</main>
	);
}
