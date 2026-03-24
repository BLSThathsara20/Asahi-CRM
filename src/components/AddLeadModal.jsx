import { AnimatePresence, motion } from "framer-motion";
import { Plus, Save, X } from "lucide-react";
import { useEffect, useState } from "react";
import { SOURCES } from "../constants.js";
import { useAuth } from "../context/AuthContext.jsx";
import { appendLeadRow } from "../services/sheetsApi.js";
import { formatSheetsThrownError } from "../utils/sheetsErrors.js";

const initial = {
	name: "",
	phone: "",
	email: "",
	car: "",
	source: "Website",
	notes: "",
};

export function AddLeadModal({ open, onClose, onSaved }) {
	const {
		getSheetsAccessToken,
		invalidateSheetsToken,
	} = useAuth();
	const [form, setForm] = useState(initial);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState(null);

	useEffect(() => {
		if (open) {
			setForm(initial);
			setError(null);
		}
	}, [open]);

	function set(field, value) {
		setForm((f) => ({ ...f, [field]: value }));
	}

	async function withToken(fn) {
		const token = await getSheetsAccessToken();
		if (!token) {
			throw new Error("SHEETS_NOT_CONNECTED");
		}
		try {
			return await fn(token);
		} catch (e) {
			if (e?.code === "UNAUTHORIZED" || e?.message === "UNAUTHORIZED") {
				invalidateSheetsToken();
			}
			throw e;
		}
	}

	async function handleSave(e) {
		e.preventDefault();
		if (!form.name.trim()) {
			setError("Name is required");
			return;
		}
		setError(null);
		setSaving(true);
		try {
			const today = new Date().toISOString().slice(0, 10);
			await withToken((token) =>
				appendLeadRow(token, {
					date: today,
					name: form.name.trim(),
					phone: form.phone.trim(),
					email: form.email.trim(),
					car: form.car.trim(),
					source: form.source,
					status: "New",
					notes: form.notes.trim(),
				}),
			);
			onSaved?.();
			onClose();
		} catch (err) {
			setError(formatSheetsThrownError(err));
		} finally {
			setSaving(false);
		}
	}

	return (
		<AnimatePresence>
			{open ? (
			<motion.div
				key="add-lead"
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
					className="relative z-10 flex max-h-[min(92vh,680px)] w-full max-w-lg flex-col rounded-t-2xl border border-slate-200/90 bg-white shadow-2xl sm:rounded-2xl"
				>
					<div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
						<div className="flex items-center gap-2">
							<div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-white">
								<Plus className="h-5 w-5" />
							</div>
							<h2 className="text-lg font-semibold text-slate-900">
								Add lead
							</h2>
						</div>
						<button
							type="button"
							onClick={onClose}
							className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
						>
							<X className="h-5 w-5" />
						</button>
					</div>

					<form
						onSubmit={handleSave}
						className="flex flex-1 flex-col overflow-hidden"
					>
						<div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
							<div>
								<label
									htmlFor="add-name"
									className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500"
								>
									Name *
								</label>
								<input
									id="add-name"
									required
									value={form.name}
									onChange={(e) => set("name", e.target.value)}
									className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none ring-slate-900/5 focus:border-slate-300 focus:ring-2 focus:ring-slate-900/10"
								/>
							</div>
							<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
								<div>
									<label
										htmlFor="add-phone"
										className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500"
									>
										Phone
									</label>
									<input
										id="add-phone"
										type="tel"
										value={form.phone}
										onChange={(e) => set("phone", e.target.value)}
										className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none ring-slate-900/5 focus:border-slate-300 focus:ring-2 focus:ring-slate-900/10"
									/>
								</div>
								<div>
									<label
										htmlFor="add-email"
										className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500"
									>
										Email
									</label>
									<input
										id="add-email"
										type="email"
										value={form.email}
										onChange={(e) => set("email", e.target.value)}
										className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none ring-slate-900/5 focus:border-slate-300 focus:ring-2 focus:ring-slate-900/10"
									/>
								</div>
							</div>
							<div>
								<label
									htmlFor="add-car"
									className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500"
								>
									Car
								</label>
								<input
									id="add-car"
									value={form.car}
									onChange={(e) => set("car", e.target.value)}
									className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none ring-slate-900/5 focus:border-slate-300 focus:ring-2 focus:ring-slate-900/10"
								/>
							</div>
							<div>
								<label
									htmlFor="add-source"
									className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500"
								>
									Source
								</label>
								<select
									id="add-source"
									value={form.source}
									onChange={(e) => set("source", e.target.value)}
									className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none ring-slate-900/5 focus:border-slate-300 focus:ring-2 focus:ring-slate-900/10"
								>
									{SOURCES.map((s) => (
										<option key={s} value={s}>
											{s}
										</option>
									))}
								</select>
							</div>
							<div>
								<label
									htmlFor="add-notes"
									className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500"
								>
									Notes
								</label>
								<textarea
									id="add-notes"
									value={form.notes}
									onChange={(e) => set("notes", e.target.value)}
									rows={4}
									className="w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none ring-slate-900/5 focus:border-slate-300 focus:ring-2 focus:ring-slate-900/10"
								/>
							</div>
							{error && (
								<p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800 ring-1 ring-rose-200/80">
									{error}
								</p>
							)}
						</div>
						<div className="border-t border-slate-100 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
							<motion.button
								type="submit"
								whileTap={{ scale: 0.99 }}
								disabled={saving}
								className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-white shadow-lg shadow-slate-900/15 transition-opacity hover:bg-slate-800 disabled:opacity-60"
							>
								<Save className="h-4 w-4" />
								{saving ? "Saving…" : "Save lead"}
							</motion.button>
						</div>
					</form>
				</motion.div>
			</motion.div>
			) : null}
		</AnimatePresence>
	);
}
