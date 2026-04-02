import { motion } from "framer-motion";
import { ArrowLeft, Loader2, LogIn, Mail, X } from "lucide-react";
import { useState } from "react";
import { formatAllowedDomainsForUi, LOGO_URL } from "../constants.js";
import { useAuth } from "../context/AuthContext.jsx";
import { isFirebaseConfigured } from "../firebase.js";
import { signInAllowed } from "../utils/accessControl.js";
import { isCrmAccessGranted } from "../utils/crmAccessGate.js";

/**
 * @typedef {"email" | "password" | "denied"} LoginStep
 */

export function LoginPage() {
	const {
		signInWithEmailPassword,
		sendPasswordReset,
		signInWithGoogle,
		accessDenied,
		authReady,
		authMessage,
		clearAuthMessage,
		signInLoading,
	} = useAuth();

	const [step, setStep] = useState(/** @type {LoginStep} */ ("email"));
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [checkLoading, setCheckLoading] = useState(false);

	const msgStyles =
		authMessage?.type === "info"
			? "bg-amber-50 text-amber-950 ring-amber-200/80"
			: "bg-rose-50 text-rose-900 ring-rose-200/80";

	function goBackToEmail() {
		setStep("email");
		setPassword("");
		clearAuthMessage();
	}

	async function handleCheckEmail() {
		clearAuthMessage();
		const em = String(email || "").trim();
		if (!signInAllowed(em)) {
			setStep("denied");
			return;
		}
		setCheckLoading(true);
		try {
			const granted = await isCrmAccessGranted(em.toLowerCase());
			if (!granted) {
				setStep("denied");
				return;
			}
			// Always show the password step: Firebase “email enumeration protection”
			// often hides whether `password` sign-in exists, which wrongly sent users to
			// “setup required” after they had already set a password.
			setStep("password");
		} finally {
			setCheckLoading(false);
		}
	}

	async function handleSubmitPassword(e) {
		e.preventDefault();
		await signInWithEmailPassword(email, password);
	}

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
							{step === "email" && "Enter your work email"}
							{step === "password" && "Sign in"}
							{step === "denied" && "No access"}
						</p>
						<p className="mt-2 text-xs text-slate-400">
							Admins manage people in <strong>Team</strong>. Superadmins can issue
							a one-time link to create a password. Allowed domains:{" "}
							<strong className="font-medium text-slate-600">
								{formatAllowedDomainsForUi()}
							</strong>
							.
						</p>
					</div>
				</div>

				{!isFirebaseConfigured && (
					<p className="mb-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900 ring-1 ring-amber-200/80">
						Firebase is not configured. Add{" "}
						<code className="rounded bg-amber-100/80 px-1 text-xs">
							VITE_FIREBASE_*
						</code>{" "}
						to <code className="rounded bg-amber-100/80 px-1 text-xs">.env</code>{" "}
						and restart.
					</p>
				)}

				{step === "denied" ? (
					<div className="space-y-4">
						<p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-800 ring-1 ring-rose-200/80">
							<strong>You don’t have access.</strong> This email isn’t allowed for
							this app. Use a company address or ask an admin to add you in{" "}
							<strong>Team</strong> / Sanity, or check{" "}
							<code className="rounded bg-rose-100/80 px-1 text-xs">
								VITE_SUPERADMIN_EMAILS
							</code>
							.
						</p>
						<button
							type="button"
							onClick={() => {
								setStep("email");
								setEmail("");
							}}
							className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
						>
							<ArrowLeft className="h-4 w-4" />
							Try a different email
						</button>
					</div>
				) : null}

				{accessDenied && step !== "denied" ? (
					<motion.p
						initial={{ opacity: 0, height: 0 }}
						animate={{ opacity: 1, height: "auto" }}
						className="mb-4 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-800 ring-1 ring-rose-200/80"
					>
						<strong>Access not granted</strong> after sign-in. Use an invited email
						or contact an administrator.
					</motion.p>
				) : null}

				{authMessage && step !== "denied" ? (
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
				) : null}

				{step === "email" ? (
					<div className="space-y-4">
						<div>
							<label className="mb-1 block text-xs font-medium text-slate-500">
								Email
							</label>
							<input
								type="email"
								autoComplete="email"
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
								required
							/>
						</div>
						<motion.button
							type="button"
							whileTap={{ scale: 0.98 }}
							disabled={
								!isFirebaseConfigured || !authReady || checkLoading || !email.trim()
							}
							onClick={() => void handleCheckEmail()}
							className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3.5 text-sm font-medium text-white shadow-lg shadow-slate-900/20 hover:bg-slate-800 disabled:pointer-events-none disabled:opacity-50"
						>
							{checkLoading ? (
								<>
									<Loader2 className="h-5 w-5 animate-spin opacity-90" />
									Checking…
								</>
							) : (
								<>
									<Mail className="h-5 w-5 opacity-90" />
									Continue with email
								</>
							)}
						</motion.button>

						<div className="relative py-1">
							<div
								className="absolute inset-0 flex items-center"
								aria-hidden
							>
								<div className="w-full border-t border-slate-200" />
							</div>
							<div className="relative flex justify-center text-xs">
								<span className="bg-white px-2 text-slate-400">or</span>
							</div>
						</div>

						<motion.button
							type="button"
							whileTap={{ scale: 0.98 }}
							disabled={!isFirebaseConfigured || !authReady || signInLoading || checkLoading}
							onClick={() => signInWithGoogle()}
							className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-sm font-medium text-slate-800 shadow-sm hover:bg-slate-50 disabled:pointer-events-none disabled:opacity-50"
						>
							{signInLoading ? (
								<Loader2 className="h-5 w-5 animate-spin opacity-90" />
							) : (
								<LogIn className="h-5 w-5 opacity-90" aria-hidden />
							)}
							Sign in with Google
						</motion.button>
						<p className="text-center text-[0.65rem] leading-relaxed text-slate-400">
							Google opens a consent window and may request Gmail access if your
							role needs it.
						</p>
					</div>
				) : null}

				{step === "password" ? (
					<form onSubmit={handleSubmitPassword} className="space-y-4">
						<p className="text-xs text-slate-500">
							Email:{" "}
							<span className="font-medium text-slate-700">{email}</span>
							{" · "}
							<button
								type="button"
								onClick={() => goBackToEmail()}
								className="font-medium text-sky-700 hover:underline"
							>
								Change
							</button>
						</p>
						<p className="rounded-lg bg-slate-50 px-3 py-2 text-[0.7rem] leading-relaxed text-slate-600 ring-1 ring-slate-100">
							Haven’t created a password yet? A superadmin can send a{" "}
							<strong>setup link</strong> from <strong>Team</strong>. Or use
							Google below if your account was created that way.
						</p>
						<div>
							<label className="mb-1 block text-xs font-medium text-slate-500">
								Password
							</label>
							<input
								type="password"
								autoComplete="current-password"
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
								required
								minLength={6}
							/>
						</div>
						<motion.button
							type="submit"
							whileTap={{ scale: 0.98 }}
							disabled={!isFirebaseConfigured || !authReady || signInLoading}
							className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3.5 text-sm font-medium text-white shadow-lg shadow-slate-900/20 hover:bg-slate-800 disabled:pointer-events-none disabled:opacity-50"
						>
							{signInLoading ? (
								<>
									<Loader2 className="h-5 w-5 animate-spin opacity-90" />
									Signing in…
								</>
							) : (
								<>
									<Mail className="h-5 w-5 opacity-90" />
									Sign in
								</>
							)}
						</motion.button>
						<button
							type="button"
							onClick={() => sendPasswordReset(email)}
							disabled={!isFirebaseConfigured || !email.trim() || signInLoading}
							className="w-full text-center text-xs font-medium text-slate-500 hover:text-slate-800 disabled:opacity-50"
						>
							Forgot password?
						</button>
					</form>
				) : null}

				{step === "password" ? (
					<div className="mt-6 border-t border-slate-100 pt-6">
						<p className="mb-2 text-center text-xs text-slate-400">
							Prefer Google?
						</p>
						<motion.button
							type="button"
							whileTap={{ scale: 0.98 }}
							disabled={!isFirebaseConfigured || !authReady || signInLoading}
							onClick={() => signInWithGoogle()}
							className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:pointer-events-none disabled:opacity-50"
						>
							<LogIn className="h-4 w-4 opacity-90" />
							Sign in with Google
						</motion.button>
					</div>
				) : null}
			</motion.div>
		</div>
	);
}
