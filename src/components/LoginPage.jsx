import { motion } from "framer-motion";
import { Loader2, LogIn, X } from "lucide-react";
import { formatAllowedDomainsForUi, LOGO_URL } from "../constants.js";
import { useAuth } from "../context/AuthContext.jsx";

export function LoginPage() {
	const {
		isFirebaseConfigured,
		signInWithGoogle,
		accessDenied,
		authReady,
		authMessage,
		clearAuthMessage,
		signInLoading,
	} = useAuth();

	const msgStyles =
		authMessage?.type === "info"
			? "bg-amber-50 text-amber-950 ring-amber-200/80"
			: "bg-rose-50 text-rose-900 ring-rose-200/80";

	return (
		<div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-slate-50 via-white to-slate-50 px-6 py-16">
			<motion.div
				initial={{ opacity: 0, y: 12 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
				className="w-full max-w-md rounded-2xl border border-slate-200/80 bg-white/90 p-8 shadow-xl shadow-slate-200/50 backdrop-blur-sm"
			>
				<div className="mb-8 flex flex-col items-center gap-4">
					<motion.img
						src={LOGO_URL}
						alt="Asahi Motors"
						className="h-14 w-auto object-contain"
						initial={{ opacity: 0, scale: 0.96 }}
						animate={{ opacity: 1, scale: 1 }}
						transition={{ delay: 0.08, duration: 0.4 }}
					/>
					<div className="text-center">
						<h1 className="text-2xl font-semibold tracking-tight text-slate-900">
							Asahi CRM
						</h1>
						<p className="mt-1 text-sm text-slate-500">
							Sign in with your company Google account
						</p>
					</div>
				</div>

				{!isFirebaseConfigured && (
					<p className="mb-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900 ring-1 ring-amber-200/80">
						Firebase is not configured. Add{" "}
						<code className="rounded bg-amber-100/80 px-1 text-xs">
							VITE_FIREBASE_*
						</code>{" "}
						to{" "}
						<code className="rounded bg-amber-100/80 px-1 text-xs">
							.env
						</code>{" "}
						and restart the dev server.
					</p>
				)}

				{accessDenied && (
					<motion.p
						initial={{ opacity: 0, height: 0 }}
						animate={{ opacity: 1, height: "auto" }}
						className="mb-4 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-800 ring-1 ring-rose-200/80"
					>
						<strong>Access denied.</strong> Only company accounts
						on{" "}
						<code className="rounded bg-rose-100/80 px-1 text-xs">
							{formatAllowedDomainsForUi()}
						</code>{" "}
						can use this app.
					</motion.p>
				)}

				{authMessage && (
					<motion.div
						role="alert"
						initial={{ opacity: 0, y: -4 }}
						animate={{ opacity: 1, y: 0 }}
						className={`relative mb-4 rounded-xl px-4 py-3 pr-10 text-sm ring-1 ${msgStyles}`}
					>
						<p className="font-medium leading-snug">
							{authMessage.type === "error"
								? "Sign-in problem"
								: "Notice"}
						</p>
						<p className="mt-1.5 leading-relaxed opacity-95">
							{authMessage.message}
						</p>
						<button
							type="button"
							onClick={() => clearAuthMessage()}
							className="absolute right-2 top-2 rounded-lg p-1.5 opacity-70 transition-opacity hover:bg-black/5 hover:opacity-100"
							aria-label="Dismiss message"
						>
							<X className="h-4 w-4" />
						</button>
					</motion.div>
				)}

				<motion.button
					type="button"
					whileTap={{ scale: 0.98 }}
					whileHover={{ scale: signInLoading ? 1 : 1.01 }}
					disabled={
						!isFirebaseConfigured || !authReady || signInLoading
					}
					onClick={() => signInWithGoogle()}
					className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3.5 text-sm font-medium text-white shadow-lg shadow-slate-900/20 transition-[box-shadow,opacity] hover:bg-slate-800 disabled:pointer-events-none disabled:opacity-50"
				>
					{signInLoading ? (
						<>
							<Loader2
								className="h-5 w-5 shrink-0 animate-spin opacity-90"
								aria-hidden
							/>
							Signing in…
						</>
					) : (
						<>
							<LogIn className="h-5 w-5 opacity-90" aria-hidden />
							Sign in with Google
						</>
					)}
				</motion.button>
			</motion.div>
		</div>
	);
}
