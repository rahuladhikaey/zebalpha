"use client";

import { useState, type FormEvent } from "react";
import Logo from "@/assets/images/official-logo.png";
import Image from "next/image";

export default function AdminLoginPage() {
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
				window.location.href = "/dashboard";
			} else {
				setAuthError(data.message || "Incorrect admin credentials.");
			}
		} catch (error) {
			setAuthError("Server error. Please try again.");
		}
		setLoading(false);
	};

	return (
		<main className="min-h-screen flex items-center justify-center p-4 bg-black text-white">
			<section className="w-full max-w-md">
				<div className="rounded-3xl bg-zinc-950 border border-zinc-800 p-8 shadow-2xl flex flex-col items-center">
					<div className="mb-6">
						<a href="http://localhost:3000">
							<Image
								src={Logo}
								alt="ZEB-ALPHA Super Admin"
								className="h-16 w-16 rounded-full object-cover border border-zinc-700 shadow-md"
							/>
						</a>
					</div>

					<div className="text-center mb-8">
						<span className="text-[11px] font-black uppercase tracking-widest text-zinc-400">
							Super Admin Portal
						</span>
						<h1 className="mt-1 text-3xl font-black tracking-tight text-white">
							Admin Login
						</h1>
						<p className="mt-2 text-xs text-zinc-400 font-medium">
							Enter your credentials to access system management.
						</p>
					</div>

					<form className="w-full space-y-4" onSubmit={handleAccessSubmit}>
						<div className="space-y-4">
							<div className="space-y-1 text-left">
								<label className="block text-xs font-bold text-zinc-300">
									Username
								</label>
								<input
									type="text"
									required
									value={username}
									onChange={(event) => setUsername(event.target.value)}
									placeholder="Enter admin username"
									className="w-full rounded-2xl border border-zinc-800 bg-zinc-900/90 px-4 py-3.5 text-sm font-medium text-white outline-none placeholder:text-zinc-500 focus:border-white transition-all"
								/>
							</div>

							<div className="space-y-1 text-left">
								<label className="block text-xs font-bold text-zinc-300">
									Password
								</label>
								<input
									type="password"
									required
									value={password}
									onChange={(event) => setPassword(event.target.value)}
									placeholder="••••••••••••"
									className="w-full rounded-2xl border border-zinc-800 bg-zinc-900/90 px-4 py-3.5 text-sm font-medium text-white outline-none placeholder:text-zinc-500 focus:border-white transition-all"
								/>
							</div>
						</div>

						{authError ? (
							<div className="p-3.5 rounded-2xl bg-rose-950/60 border border-rose-800/80 text-xs font-semibold text-rose-300">
								{authError}
							</div>
						) : null}

						<button
							type="submit"
							disabled={loading}
							className="w-full py-3.5 rounded-2xl bg-white hover:bg-zinc-200 text-black text-sm font-black uppercase tracking-wider transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer shadow-lg shadow-white/10"
						>
							{loading ? "Authenticating..." : "Log In"}
						</button>
					</form>

					<div className="mt-6 text-center border-t border-zinc-800/80 pt-5 w-full">
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
