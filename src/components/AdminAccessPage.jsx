import { motion } from "framer-motion";
import { Loader2, Trash2, UserPlus } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
	addInvitedEmail,
	listInvitedEmails,
	removeInvitedEmail,
} from "../services/firestoreAccessList.js";
import { useAuth } from "../context/AuthContext.jsx";
import { isSuperAdminEmail } from "../utils/accessControl.js";

export function AdminAccessPage() {
	const { user } = useAuth();
	const [rows, setRows] = useState([]);
	const [loading, setLoading] = useState(true);
	const [emailInput, setEmailInput] = useState("");
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState(null);
	const [dbError, setDbError] = useState(null);

	const load = useCallback(async () => {
		setDbError(null);
		setLoading(true);
		try {
			const list = await listInvitedEmails();
			setRows(list);
		} catch (e) {
			setDbError(
				e?.message ||
					"Could not load the list. Enable Firestore and deploy security rules (see README).",
			);
			setRows([]);
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		load();
	}, [load]);

	const isAdmin = isSuperAdminEmail(user?.email);

	async function handleAdd(e) {
		e.preventDefault();
		setError(null);
		const raw = emailInput.trim();
		if (!raw) return;
		setBusy(true);
		try {
			await addInvitedEmail(raw, user?.email);
			setEmailInput("");
			await load();
		} catch (err) {
			setError(err?.message || "Could not add email");
		} finally {
			setBusy(false);
		}
	}

	async function handleRemove(emailKey) {
		if (!confirm(`Remove access for ${emailKey}?`)) return;
		setBusy(true);
		setError(null);
		try {
			await removeInvitedEmail(emailKey);
			await load();
		} catch (err) {
			setError(err?.message || "Could not remove");
		} finally {
			setBusy(false);
		}
	}

	if (!isAdmin) {
		return (
			<p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-800 ring-1 ring-rose-200/80">
				You don&apos;t have permission to manage access.
			</p>
		);
	}

	return (
		<div className="mx-auto max-w-xl space-y-6">
			<p className="text-sm leading-relaxed text-slate-600">
				Users on your company domains can always sign in. Add other Google
				emails here so they can use the CRM (they must sign in with that
				exact Google account).
			</p>

			{dbError && (
				<p
					role="alert"
					className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-950 ring-1 ring-amber-200/80"
				>
					{dbError}
				</p>
			)}

			<form
				onSubmit={handleAdd}
				className="flex flex-col gap-3 sm:flex-row sm:items-end"
			>
				<div className="min-w-0 flex-1">
					<label
						htmlFor="invite-email"
						className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500"
					>
						Invite email
					</label>
					<input
						id="invite-email"
						type="email"
						value={emailInput}
						onChange={(e) => setEmailInput(e.target.value)}
						placeholder="someone@gmail.com"
						className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none focus:border-slate-300 focus:ring-2 focus:ring-slate-900/10"
					/>
				</div>
				<motion.button
					type="submit"
					disabled={busy}
					whileTap={{ scale: busy ? 1 : 0.99 }}
					className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
				>
					{busy ? (
						<Loader2 className="h-4 w-4 animate-spin" />
					) : (
						<UserPlus className="h-4 w-4" />
					)}
					Add access
				</motion.button>
			</form>

			{error && (
				<p className="text-sm text-rose-600" role="alert">
					{error}
				</p>
			)}

			<div>
				<h2 className="mb-2 text-sm font-semibold text-slate-800">
					Invited emails ({rows.length})
				</h2>
				{loading ? (
					<p className="text-sm text-slate-500">Loading…</p>
				) : rows.length === 0 ? (
					<p className="text-sm text-slate-500">No extra invites yet.</p>
				) : (
					<ul className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white">
						{rows.map((r) => (
							<li
								key={r.id}
								className="flex items-center justify-between gap-2 px-4 py-3 text-sm"
							>
								<span className="truncate font-medium text-slate-900">
									{r.email || r.id}
								</span>
								<button
									type="button"
									disabled={busy}
									onClick={() => handleRemove(r.id)}
									className="shrink-0 rounded-lg p-2 text-rose-600 hover:bg-rose-50 disabled:opacity-50"
									title="Remove"
								>
									<Trash2 className="h-4 w-4" />
								</button>
							</li>
						))}
					</ul>
				)}
			</div>
		</div>
	);
}
