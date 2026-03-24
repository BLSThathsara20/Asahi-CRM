import { AnimatePresence, motion } from "framer-motion";
import {
	ExternalLink,
	Mail,
	MessageCircle,
	Save,
	X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { STATUSES } from "../constants.js";
import { useAuth } from "../context/AuthContext.jsx";
import { updateLeadRow } from "../services/sheetsApi.js";
import { formatSheetsThrownError } from "../utils/sheetsErrors.js";
import { phoneToWaDigits } from "../utils/phone.js";
import { StatusBadge } from "./StatusBadge.jsx";

export function LeadDetailPanel({ lead, open, onClose, onSaved }) {
	const { getSheetsAccessToken, refreshSheetsToken } = useAuth();
	const [status, setStatus] = useState(lead?.status || "New");
	const [notes, setNotes] = useState(lead?.notes || "");
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState(null);

	useEffect(() => {
		if (lead) {
			setStatus(lead.status || "New");
			setNotes(lead.notes || "");
		}
	}, [lead]);

	async function withToken(fn) {
		let token = await getSheetsAccessToken();
		try {
			return await fn(token);
		} catch (e) {
			if (e?.code === "UNAUTHORIZED" || e?.message === "UNAUTHORIZED") {
				token = await refreshSheetsToken();
				return await fn(token);
			}
			throw e;
		}
	}

	async function handleSave() {
		if (!lead) return;
		setError(null);
		setSaving(true);
		try {
			await withToken((token) =>
				updateLeadRow(token, lead.sheetRow, {
					...lead,
					status,
					notes,
				}),
			);
			onSaved?.();
			onClose();
		} catch (e) {
			setError(formatSheetsThrownError(e));
		} finally {
			setSaving(false);
		}
	}

	const wa = phoneToWaDigits(lead?.phone);
	const waUrl = wa ? `https://wa.me/${wa}` : null;
	const mailUrl = lead?.email
		? `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(lead.email)}`
		: null;
	const showAutotrader =
		String(lead?.source || "").toLowerCase() === "autotrader";

	return (
		<AnimatePresence>
			{open && lead ? (
			<motion.div
				key={lead.sheetRow}
				className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center sm:p-4"
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				exit={{ opacity: 0 }}
				transition={{ duration: 0.2 }}
			>
				<button
					type="button"
					className="absolute inset-0 bg-slate-900/30 backdrop-blur-[2px]"
					aria-label="Close"
					onClick={onClose}
				/>
				<motion.div
					role="dialog"
					aria-modal="true"
					initial={{ y: "100%", opacity: 0.9 }}
					animate={{ y: 0, opacity: 1 }}
					exit={{ y: "100%", opacity: 0 }}
					transition={{ type: "spring", damping: 28, stiffness: 320 }}
					className="relative z-10 flex max-h-[min(92vh,720px)] w-full max-w-lg flex-col rounded-t-2xl border border-slate-200/90 bg-white shadow-2xl sm:rounded-2xl"
				>
					<div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
						<div className="min-w-0">
							<h2 className="truncate text-lg font-semibold text-slate-900">
								{lead.name || "Lead"}
							</h2>
							<p className="mt-0.5 text-sm text-slate-500">
								{lead.date} · Row {lead.sheetRow}
							</p>
						</div>
						<button
							type="button"
							onClick={onClose}
							className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
						>
							<X className="h-5 w-5" />
						</button>
					</div>

					<div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
						<dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
							<div>
								<dt className="text-slate-500">Source</dt>
								<dd className="font-medium text-slate-900">{lead.source}</dd>
							</div>
							<div className="sm:col-span-2">
								<dt className="text-slate-500">Car</dt>
								<dd className="font-medium text-slate-900">{lead.car}</dd>
							</div>
							<div>
								<dt className="text-slate-500">Phone</dt>
								<dd className="font-medium text-slate-900">{lead.phone}</dd>
							</div>
							<div>
								<dt className="text-slate-500">Email</dt>
								<dd className="break-all font-medium text-slate-900">
									{lead.email}
								</dd>
							</div>
						</dl>

						<div>
							<label
								htmlFor="lead-status"
								className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500"
							>
								Status
							</label>
							<select
								id="lead-status"
								value={status}
								onChange={(e) => setStatus(e.target.value)}
								className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none ring-slate-900/5 transition-[box-shadow,border-color] focus:border-slate-300 focus:ring-2 focus:ring-slate-900/10"
							>
								{STATUSES.map((s) => (
									<option key={s} value={s}>
										{s}
									</option>
								))}
							</select>
							<div className="mt-2">
								<StatusBadge status={status} />
							</div>
						</div>

						<div>
							<label
								htmlFor="lead-notes"
								className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500"
							>
								Notes
							</label>
							<textarea
								id="lead-notes"
								value={notes}
								onChange={(e) => setNotes(e.target.value)}
								rows={5}
								className="w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none ring-slate-900/5 transition-[box-shadow,border-color] focus:border-slate-300 focus:ring-2 focus:ring-slate-900/10"
							/>
						</div>

						{error && (
							<p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800 ring-1 ring-rose-200/80">
								{error}
							</p>
						)}

						<div className="flex flex-wrap gap-2">
							{waUrl && (
								<a
									href={waUrl}
									target="_blank"
									rel="noopener noreferrer"
									className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 shadow-sm transition-[transform,box-shadow] hover:border-slate-300 hover:shadow"
								>
									<MessageCircle className="h-4 w-4 text-emerald-600" />
									Send WhatsApp
								</a>
							)}
							{mailUrl && (
								<a
									href={mailUrl}
									target="_blank"
									rel="noopener noreferrer"
									className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 shadow-sm transition-[transform,box-shadow] hover:border-slate-300 hover:shadow"
								>
									<Mail className="h-4 w-4 text-sky-600" />
									Send Email
								</a>
							)}
							{showAutotrader && (
								<a
									href="https://portal.autotrader.co.uk/portal/sales-hub/all"
									target="_blank"
									rel="noopener noreferrer"
									className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 shadow-sm transition-[transform,box-shadow] hover:border-slate-300 hover:shadow"
								>
									<ExternalLink className="h-4 w-4 text-violet-600" />
									Open Autotrader
								</a>
							)}
						</div>
					</div>

					<div className="border-t border-slate-100 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
						<motion.button
							type="button"
							whileTap={{ scale: 0.99 }}
							disabled={saving}
							onClick={handleSave}
							className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-white shadow-lg shadow-slate-900/15 transition-opacity hover:bg-slate-800 disabled:opacity-60"
						>
							<Save className="h-4 w-4" />
							{saving ? "Saving…" : "Save changes"}
						</motion.button>
					</div>
				</motion.div>
			</motion.div>
			) : null}
		</AnimatePresence>
	);
}
