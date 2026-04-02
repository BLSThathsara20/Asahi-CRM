import { motion } from "framer-motion";
import { Link2, Loader2, LogOut } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { LOGO_URL } from "../constants.js";
import { useAuth } from "../context/AuthContext.jsx";

/**
 * Shown after Firebase sign-in until a Google access token for Gmail is stored.
 */
export function GoogleConnectScreen() {
	const { connectGoogleAccess, signOutUser, user } = useAuth();
	const navigate = useNavigate();
	const [busy, setBusy] = useState(false);
	const [localError, setLocalError] = useState(null);

	async function handleConnect() {
		setLocalError(null);
		setBusy(true);
		try {
			await connectGoogleAccess();
			navigate("/dashboard", { replace: true });
		} catch (e) {
			setLocalError(
				e?.message ||
					"Could not connect Google. Try again or sign out.",
			);
		} finally {
			setBusy(false);
		}
	}

	return (
		<div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-slate-50 via-white to-slate-50 px-6 py-16">
			<motion.div
				initial={{ opacity: 0, y: 10 }}
				animate={{ opacity: 1, y: 0 }}
				className="w-full max-w-md rounded-2xl border border-slate-200/80 bg-white p-8 shadow-xl shadow-slate-200/50"
			>
				<div className="mb-6 flex flex-col items-center gap-3">
					<img
						src={LOGO_URL}
						alt=""
						className="h-12 w-auto object-contain"
					/>
					<h1 className="text-center text-xl font-semibold text-slate-900">
						Connect Gmail
					</h1>
					<p className="text-center text-sm text-slate-500">
						Signed in as{" "}
						<span className="font-medium text-slate-700">
							{user?.email}
						</span>
					</p>
				</div>

				<p className="mb-6 text-center text-sm leading-relaxed text-slate-600">
					Your password login doesn’t include Gmail. Link your Google account
					once so we can <strong>read</strong> enquiry mail and apply labels.
					If you already use Google sign-in, this refreshes the same access.
					CRM data still lives in <strong>Sanity</strong>.
				</p>

				{localError && (
					<p
						role="alert"
						className="mb-4 rounded-xl bg-rose-50 px-4 py-3 text-sm leading-relaxed text-rose-800 ring-1 ring-rose-200/80"
					>
						{localError}
					</p>
				)}

				<motion.button
					type="button"
					disabled={busy}
					whileTap={{ scale: busy ? 1 : 0.99 }}
					onClick={() => handleConnect()}
					className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3.5 text-sm font-medium text-white shadow-lg shadow-slate-900/20 hover:bg-slate-800 disabled:opacity-60"
				>
					{busy ? (
						<Loader2 className="h-5 w-5 animate-spin" />
					) : (
						<Link2 className="h-5 w-5" />
					)}
					{busy ? "Opening Google…" : "Continue with Google"}
				</motion.button>

				<p className="mt-4 text-center text-xs text-slate-400">
					Allow pop-ups. If you see a scope error, confirm{" "}
					<code className="rounded bg-slate-100 px-1">
						gmail.readonly
					</code>{" "}
					and{" "}
					<code className="rounded bg-slate-100 px-1">
						gmail.modify
					</code>{" "}
					are on your Cloud project OAuth consent screen, then try
					<strong> Continue with Google</strong> again.
				</p>

				<button
					type="button"
					onClick={() => signOutUser()}
					className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-600 hover:bg-slate-50"
				>
					<LogOut className="h-4 w-4" />
					Sign out and use another account
				</button>
			</motion.div>
		</div>
	);
}
