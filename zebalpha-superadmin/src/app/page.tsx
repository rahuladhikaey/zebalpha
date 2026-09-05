"use client";

import { useState, type FormEvent } from "react";
import Logo from "@/assets/images/official-logo.png";
import Image from "next/image";
import { ShieldCheck, Lock, KeyRound, AlertCircle } from "lucide-react";

export default function AdminLoginPage() {
	const [adminKey1, setAdminKey1] = useState("");
	const [adminKey2, setAdminKey2] = useState("");
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
					adminKey1: adminKey1.trim(), 
					adminKey2: adminKey2.trim() 
				}),
			});
			const data = await res.json();
			if (res.ok && data.success) {
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
								<input
									type="password"
									required
									autoComplete="off"
									value={adminKey1}
									onChange={(event) => setAdminKey1(event.target.value)}
									placeholder="Enter primary administrative key"
									className="w-full rounded-2xl border border-zinc-800 bg-zinc-900/90 px-4 py-3 text-sm font-mono text-white outline-none placeholder:text-zinc-500 placeholder:font-sans focus:border-white focus:bg-zinc-900 transition-all"
								/>
							</div>

							<div className="space-y-1 text-left">
								<label className="flex items-center gap-1.5 text-xs font-bold text-zinc-300">
									<Lock size={13} className="text-zinc-400" />
									Security Factor 2 (Secondary Passcode)
								</label>
								<input
									type="password"
									required
									autoComplete="off"
									value={adminKey2}
									onChange={(event) => setAdminKey2(event.target.value)}
									placeholder="Enter secondary security key"
									className="w-full rounded-2xl border border-zinc-800 bg-zinc-900/90 px-4 py-3 text-sm font-mono text-white outline-none placeholder:text-zinc-500 placeholder:font-sans focus:border-white focus:bg-zinc-900 transition-all"
								/>
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
