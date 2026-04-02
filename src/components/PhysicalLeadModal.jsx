import { AnimatePresence, motion } from "framer-motion";
import { Loader2, X } from "lucide-react";
import { useState } from "react";
import {
	PHYSICAL_LEAD_SOURCE,
	STATUSES,
} from "../constants.js";
import { upsertLeadToSanity } from "../services/sanityLeadsApi.js";
import { formatSanityThrownError } from "../utils/sanityErrors.js";
import { internalDateToSheetDate } from "../utils/gmailParse.js";

export function PhysicalLeadModal({ open, onClose, onCreated }) {
	const [name, setName] = useState("");
	const [phone, setPhone] = useState("");
	const [email, setEmail] = useState("");
	const [car, setCar] = useState("");
	const [source, setSource] = useState(PHYSICAL_LEAD_SOURCE);
	const [notes, setNotes] = useState("");
	const [handledBy, setHandledBy] = useState("");
	const [followUpDate, setFollowUpDate] = useState("");
	const [status, setStatus] = useState("New");
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState(null);

	function reset() {
		setName("");
		setPhone("");
		setEmail("");
		setCar("");
		setSource(PHYSICAL_LEAD_SOURCE);
		setNotes("");
		setHandledBy("");
		setFollowUpDate("");
		setStatus("New");
		setError(null);
	}

	async function handleSubmit(e) {
		e.preventDefault();
		setError(null);
		setBusy(true);
		try {
			const today = internalDateToSheetDate(Date.now());
			const row = {
				date: today || new Date().toISOString().slice(0, 10),
				name: name.trim(),
				phone: phone.trim(),
				email: email.trim(),
				car: car.trim(),
				source: source.trim() || PHYSICAL_LEAD_SOURCE,
				status,
				notes: notes.trim(),
				handledBy: handledBy.trim(),
				followUpDate: followUpDate.trim(),
				subject: name.trim()
					? `Walk-in: ${name.trim()}`
					: "Walk-in / showroom lead",
				snippet: notes.trim().slice(0, 200),
				bodyText: notes.trim(),
			};
			await upsertLeadToSanity(row);
			reset();
			onCreated?.();
			onClose();
		} catch (err) {
			setError(formatSanityThrownError(err));
		} finally {
			setBusy(false);
		}
	}

	return (
		<AnimatePresence>
			{open ? (
				<motion.div
					className="fixed inset-0 z-[70] flex items-end justify-center pt-[max(0.5rem,env(safe-area-inset-top))] sm:items-center sm:p-4"
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					exit={{ opacity: 0 }}
				>
					<button
						type="button"
						className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]"
						aria-label="Close"
						onClick={() => {
							reset();
							onClose();
						}}
					/>
					<motion.div
						role="dialog"
						aria-modal="true"
						initial={{ y: "100%", opacity: 0.95 }}
						animate={{ y: 0, opacity: 1 }}
						exit={{ y: "100%", opacity: 0 }}
						transition={{ type: "spring", damping: 28, stiffness: 320 }}
						className="relative z-10 flex max-h-[min(90dvh,calc(100dvh-env(safe-area-inset-top)-env(safe-area-inset-bottom)-1rem))] w-full max-w-md flex-col rounded-t-2xl border border-slate-200/90 bg-white shadow-2xl sm:max-h-[min(88vh,780px)] sm:rounded-2xl"
					>
						<div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
							<div className="min-w-0">
								<h2 className="text-lg font-semibold text-slate-900">
									Add physical lead
								</h2>
								<p className="mt-0.5 text-xs text-slate-500">
									Showroom, phone-in, or paper enquiry — saves to Sanity
									only (no Gmail thread).
								</p>
							</div>
							<button
								type="button"
								onClick={() => {
									reset();
									onClose();
								}}
								className="shrink-0 rounded-lg p-2 text-slate-500 hover:bg-slate-100"
							>
								<X className="h-5 w-5" />
							</button>
						</div>
						<form
							onSubmit={handleSubmit}
							className="flex min-h-0 flex-1 flex-col"
						>
							<div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4 [-webkit-overflow-scrolling:touch]">
								<div className="grid gap-3 sm:grid-cols-2">
									<div className="sm:col-span-2">
									<label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
										Name
									</label>
									<input
										required
										value={name}
										onChange={(e) => setName(e.target.value)}
										className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-900/15"
									/>
									</div>
									<div>
									<label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
										Phone
									</label>
									<input
										value={phone}
										onChange={(e) => setPhone(e.target.value)}
										className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-900/15"
									/>
								</div>
								<div>
									<label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
										Email
									</label>
									<input
										type="email"
										value={email}
										onChange={(e) => setEmail(e.target.value)}
										className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-900/15"
									/>
								</div>
								<div className="sm:col-span-2">
									<label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
										Vehicle interest
									</label>
									<input
										value={car}
										onChange={(e) => setCar(e.target.value)}
										placeholder="Make / model"
										className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-900/15"
									/>
								</div>
								<div>
									<label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
										Source
									</label>
									<select
										value={source}
										onChange={(e) => setSource(e.target.value)}
										className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-slate-900/15"
									>
										<option value={PHYSICAL_LEAD_SOURCE}>
											Physical / walk-in
										</option>
										<option value="Autotrader">Autotrader (manual)</option>
										<option value="Website">Website (manual)</option>
										<option value="Car Dealer">Car dealer (manual)</option>
										<option value="Phone">Phone enquiry</option>
										<option value="Referral">Referral</option>
									</select>
								</div>
								<div>
									<label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
										Status
									</label>
									<select
										value={status}
										onChange={(e) => setStatus(e.target.value)}
										className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-slate-900/15"
									>
										{STATUSES.map((s) => (
											<option key={s} value={s}>
												{s}
											</option>
										))}
									</select>
								</div>
								<div>
									<label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
										Follow-up date
									</label>
									<input
										type="date"
										value={followUpDate}
										onChange={(e) => setFollowUpDate(e.target.value)}
										className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-900/15"
									/>
								</div>
								<div className="sm:col-span-2">
									<label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
										Handled by
									</label>
									<input
										value={handledBy}
										onChange={(e) => setHandledBy(e.target.value)}
										className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-900/15"
									/>
								</div>
								<div className="sm:col-span-2">
									<label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
										Notes
									</label>
									<textarea
										value={notes}
										onChange={(e) => setNotes(e.target.value)}
										rows={3}
										className="max-h-40 w-full resize-y rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-900/15"
									/>
								</div>
							</div>
								{error ? (
									<p className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800 ring-1 ring-rose-200/80">
										{error}
									</p>
								) : null}
							</div>
							<div className="flex shrink-0 gap-2 border-t border-slate-100 bg-white px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
								<button
									type="button"
									onClick={() => {
										reset();
										onClose();
									}}
									className="flex-1 rounded-xl border border-slate-200 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
								>
									Cancel
								</button>
								<button
									type="submit"
									disabled={busy}
									className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-slate-900 py-3 text-sm font-medium text-white shadow-md hover:bg-slate-800 disabled:opacity-60"
								>
									{busy ? (
										<Loader2 className="h-4 w-4 animate-spin" />
									) : null}
									Save to CRM
								</button>
							</div>
						</form>
					</motion.div>
				</motion.div>
			) : null}
		</AnimatePresence>
	);
}
