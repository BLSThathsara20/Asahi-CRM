import { motion } from "framer-motion";
import { Loader2, Lock } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
	createUserWithEmailAndPassword,
	signOut,
} from "firebase/auth";
import { Link, useSearchParams } from "react-router-dom";
import { LOGO_URL } from "../constants.js";
import { auth, isFirebaseConfigured } from "../firebase.js";
import { useAuth } from "../context/AuthContext.jsx";
import {
	consumePasswordSetupToken,
	getCrmUserByPasswordSetupToken,
} from "../services/sanityCrmUsersApi.js";
import { isSanityConfigured } from "../services/sanityLeadsApi.js";
import { getAuthErrorMessage } from "../utils/authErrors.js";

export function SetPasswordPage() {
	const [searchParams] = useSearchParams();
	const token = searchParams.get("token") || "";
	const { sendPasswordReset } = useAuth();

	const [loading, setLoading] = useState(true);
	const [row, setRow] = useState(null);
	const [badToken, setBadToken] = useState(false);
	const [password, setPassword] = useState("");
	const [confirm, setConfirm] = useState("");
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState(null);
	const [done, setDone] = useState(false);
	const [suggestReset, setSuggestReset] = useState(false);

	const mismatch = confirm.length > 0 && password !== confirm;

	const shortHelp = useMemo(
		() =>
			"This link was issued by a superadmin. It can be used only once. After you set a password, sign in on the login page.",
		[],
	);

	useEffect(() => {
		let cancelled = false;
		void (async () => {
			if (!token.trim() || !isSanityConfigured()) {
				if (!cancelled) {
					setBadToken(true);
					setLoading(false);
				}
				return;
			}
			try {
				const r = await getCrmUserByPasswordSetupToken(token);
				if (cancelled) return;
				if (!r) {
					setBadToken(true);
				} else {
					setRow(r);
				}
			} catch (e) {
				console.error(e);
				if (!cancelled) setBadToken(true);
			} finally {
				if (!cancelled) setLoading(false);
			}
		})();
		return () => {
			cancelled = true;
		};
	}, [token]);

	async function handleSubmit(e) {
		e.preventDefault();
		setError(null);
		if (password.length < 6) {
			setError("Use at least 6 characters.");
			return;
		}
		if (password !== confirm) {
			setError("Passwords don’t match.");
			return;
		}
		if (!auth || !row) return;
		setBusy(true);
		try {
			await createUserWithEmailAndPassword(auth, row.email, password);
			try {
				await consumePasswordSetupToken(row._id);
			} catch (consumeErr) {
				console.error(consumeErr);
				setError(
					"Your password was saved, but the setup link could not be cleared. Tell a superadmin to regenerate your link in Team for security.",
				);
				return;
			}
			await signOut(auth);
			setDone(true);
		} catch (err) {
			const code = err?.code;
			if (code === "auth/email-already-in-use") {
				setSuggestReset(true);
				setError(
					"An account already exists for this email. Use “Email me a reset link” below, or sign in with Forgot password.",
				);
			} else {
				setError(getAuthErrorMessage(code, err?.message));
			}
			console.error(err);
		} finally {
			setBusy(false);
		}
	}

	async function emailFirebaseReset() {
		if (!row?.email) return;
		setError(null);
		await sendPasswordReset(row.email);
	}

	if (loading) {
		return (
			<div className="flex min-h-screen items-center justify-center bg-slate-50">
				<Loader2 className="h-8 w-8 animate-spin text-slate-400" />
			</div>
		);
	}

	if (badToken || !row) {
		return (
			<div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-slate-50 to-white px-6 py-16">
				<img src={LOGO_URL} alt="" className="mb-6 h-12 object-contain" />
				<div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
					<h1 className="text-lg font-semibold text-slate-900">
						Link invalid or expired
					</h1>
					<p className="mt-2 text-sm text-slate-600">
						Ask a superadmin to create a new password setup link in{" "}
						<strong>Team</strong>.
					</p>
					<Link
						to="/login"
						className="mt-6 inline-block text-sm font-medium text-slate-900 underline"
					>
						Back to sign in
					</Link>
				</div>
			</div>
		);
	}

	if (done) {
		return (
			<div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-slate-50 to-white px-6 py-16">
				<img src={LOGO_URL} alt="" className="mb-6 h-12 object-contain" />
				<div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
					<h1 className="text-lg font-semibold text-slate-900">
						Password saved
					</h1>
					<p className="mt-2 text-sm text-slate-600">
						You can sign in with your email and new password. This setup link
						can’t be used again.
					</p>
					<Link
						to="/login"
						className="mt-6 inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-white"
					>
						Go to sign in
					</Link>
				</div>
			</div>
		);
	}

	return (
		<div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-slate-50 to-white px-6 py-16">
			<motion.div
				initial={{ opacity: 0, y: 8 }}
				animate={{ opacity: 1, y: 0 }}
				className="w-full max-w-md rounded-2xl border border-slate-200/80 bg-white p-8 shadow-lg"
			>
				<img src={LOGO_URL} alt="" className="mx-auto mb-4 h-11 object-contain" />
				<h1 className="text-center text-lg font-semibold text-slate-900">
					Set your password
				</h1>
				<p className="mt-1 text-center text-xs text-slate-500">{row.email}</p>
				<p className="mt-3 text-center text-xs leading-relaxed text-slate-500">
					{shortHelp}
				</p>

				{!isFirebaseConfigured ? (
					<p className="mt-4 text-center text-sm text-amber-800">
						Firebase is not configured in this build.
					</p>
				) : (
					<form onSubmit={handleSubmit} className="mt-6 space-y-4">
						<div>
							<label className="mb-1 block text-xs font-medium text-slate-500">
								New password
							</label>
							<input
								type="password"
								autoComplete="new-password"
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
								required
								minLength={6}
							/>
						</div>
						<div>
							<label className="mb-1 block text-xs font-medium text-slate-500">
								Confirm password
							</label>
							<input
								type="password"
								autoComplete="new-password"
								value={confirm}
								onChange={(e) => setConfirm(e.target.value)}
								className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
								required
								minLength={6}
							/>
						</div>
						{mismatch ? (
							<p className="text-xs text-rose-600">Passwords don’t match.</p>
						) : null}
						{error ? (
							<p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800 ring-1 ring-rose-200/80">
								{error}
							</p>
						) : null}
						{suggestReset ? (
							<button
								type="button"
								onClick={() => emailFirebaseReset()}
								className="w-full text-center text-sm font-medium text-sky-700 hover:underline"
							>
								Email me a Firebase reset link ({row.email})
							</button>
						) : null}
						<motion.button
							type="submit"
							whileTap={{ scale: 0.98 }}
							disabled={busy || mismatch}
							className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 py-3 text-sm font-medium text-white disabled:opacity-50"
						>
							{busy ? (
								<Loader2 className="h-4 w-4 animate-spin" />
							) : (
								<Lock className="h-4 w-4" />
							)}
							Save password
						</motion.button>
					</form>
				)}

				<Link
					to="/login"
					className="mt-6 block text-center text-xs font-medium text-slate-500 hover:text-slate-800"
				>
					Cancel and return to sign in
				</Link>
			</motion.div>
		</div>
	);
}
