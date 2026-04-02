import { AnimatePresence, motion } from "framer-motion";
import { Download, Loader2, X } from "lucide-react";
import { useState } from "react";
import { fetchLeadsInDateRange } from "../services/sanityCrmUsersApi.js";
import { isSanityConfigured } from "../services/sanityLeadsApi.js";
import { formatSanityThrownError } from "../utils/sanityErrors.js";
import { downloadTextFile, leadsToCsv } from "../utils/csvExport.js";
import { internalDateToSheetDate } from "../utils/gmailParse.js";

export function ExportLeadsModal({ open, onClose }) {
	const today = internalDateToSheetDate(Date.now());
	const [from, setFrom] = useState(today);
	const [to, setTo] = useState(today);
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState(null);

	async function handleExport() {
		setError(null);
		if (!isSanityConfigured()) {
			setError("Sanity is not configured.");
			return;
		}
		const f = String(from || "").trim();
		const t = String(to || "").trim();
		if (!f || !t) {
			setError("Choose both dates.");
			return;
		}
		if (f > t) {
			setError("“From” must be on or before “To”.");
			return;
		}
		setBusy(true);
		try {
			const rows = await fetchLeadsInDateRange({ from: f, to: t });
			const csv = leadsToCsv(rows || []);
			const name = `asahi-leads_${f}_to_${t}.csv`;
			downloadTextFile(name, csv);
			onClose();
		} catch (e) {
			setError(formatSanityThrownError(e));
		} finally {
			setBusy(false);
		}
	}

	return (
		<AnimatePresence>
			{open ? (
				<motion.div
					className="fixed inset-0 z-[75] flex items-end justify-center sm:items-center sm:p-4"
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					exit={{ opacity: 0 }}
				>
					<button
						type="button"
						className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]"
						aria-label="Close"
						onClick={onClose}
					/>
					<motion.div
						role="dialog"
						aria-modal="true"
						initial={{ y: 24, opacity: 0.95 }}
						animate={{ y: 0, opacity: 1 }}
						exit={{ y: 24, opacity: 0 }}
						className="relative z-10 w-full max-w-md rounded-2xl border border-slate-200/90 bg-white p-6 shadow-2xl"
					>
						<div className="flex items-start justify-between gap-3">
							<div>
								<h2 className="text-lg font-semibold text-slate-900">
									Export leads
								</h2>
								<p className="mt-1 text-sm text-slate-500">
									Download CSV from Sanity by lead date (inclusive).
								</p>
							</div>
							<button
								type="button"
								onClick={onClose}
								className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
							>
								<X className="h-5 w-5" />
							</button>
						</div>
						<div className="mt-5 grid gap-4 sm:grid-cols-2">
							<div>
								<label className="mb-1 block text-xs font-medium text-slate-500">
									From
								</label>
								<input
									type="date"
									value={from}
									onChange={(e) => setFrom(e.target.value)}
									className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
								/>
							</div>
							<div>
								<label className="mb-1 block text-xs font-medium text-slate-500">
									To
								</label>
								<input
									type="date"
									value={to}
									onChange={(e) => setTo(e.target.value)}
									className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
								/>
							</div>
						</div>
						{error ? (
							<p className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800 ring-1 ring-rose-200/80">
								{error}
							</p>
						) : null}
						<div className="mt-6 flex gap-2">
							<button
								type="button"
								onClick={onClose}
								className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
							>
								Cancel
							</button>
							<button
								type="button"
								disabled={busy}
								onClick={() => handleExport()}
								className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-slate-900 py-2.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
							>
								{busy ? (
									<Loader2 className="h-4 w-4 animate-spin" />
								) : (
									<Download className="h-4 w-4" />
								)}
								Download CSV
							</button>
						</div>
					</motion.div>
				</motion.div>
			) : null}
		</AnimatePresence>
	);
}
