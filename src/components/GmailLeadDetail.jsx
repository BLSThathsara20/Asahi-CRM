import { AnimatePresence, motion } from "framer-motion";
import {
	CarFront,
	CheckCircle,
	ExternalLink,
	Loader2,
	Mail,
	MessageCircle,
	RotateCcw,
	Save,
	X,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { GMAIL_LEAD_LABELS, STATUSES } from "../constants.js";
import { sourcePillClass } from "../utils/leadSources.js";
import { useAuth } from "../context/AuthContext.jsx";
import {
	extractHtmlBody,
	extractPlainTextBody,
	getGmailMessage,
	markMessageDone,
	unmarkMessageDone,
} from "../services/gmailLeadsApi.js";
import {
	getLeadFromSanityById,
	getLeadFromSanityByMessageId,
	isSanityConfigured,
	patchLeadGmailMarkedDone,
	upsertLeadToSanity,
} from "../services/sanityLeadsApi.js";
import { extractAutotraderLeadDetails } from "../utils/extractAutotraderLead.js";
import { extractContactsFromText } from "../utils/extractLeadContacts.js";
import { formatSanityThrownError } from "../utils/sanityErrors.js";
import { buildGmailComposeUrl } from "../utils/gmailComposeUrl.js";
import {
	internalDateToSheetDate,
	parseFromHeader,
} from "../utils/gmailParse.js";
import { phoneToWaDigits, waMeUrlWithText } from "../utils/phone.js";
import { StatusBadge } from "./StatusBadge.jsx";

const AUTOTRADER_PORTAL = "https://portal.autotrader.co.uk/portal/sales-hub/all";

export function GmailLeadDetail({ summary, open, onClose, onSaved }) {
	const { getGoogleAccessToken, invalidateGoogleAccessToken } = useAuth();
	const [loading, setLoading] = useState(true);
	const [bodyText, setBodyText] = useState("");
	const [leadName, setLeadName] = useState("");
	const [phone, setPhone] = useState("");
	const [car, setCar] = useState("");
	const [status, setStatus] = useState("New");
	const [notes, setNotes] = useState("");
	const [handledBy, setHandledBy] = useState("");
	const [followUpDate, setFollowUpDate] = useState("");
	const [saving, setSaving] = useState(false);
	const [markingDone, setMarkingDone] = useState(false);
	const [error, setError] = useState(null);
	const [autotraderExtras, setAutotraderExtras] = useState(null);
	const [gmailMarkedDoneAt, setGmailMarkedDoneAt] = useState(null);

	const fromEmail = summary?.fromEmail || "";

	const withToken = useCallback(
		async (fn) => {
			const token = await getGoogleAccessToken();
			if (!token) throw new Error("GOOGLE_API_NOT_CONNECTED");
			try {
				return await fn(token);
			} catch (e) {
				if (e?.code === "UNAUTHORIZED" || e?.message === "UNAUTHORIZED") {
					invalidateGoogleAccessToken();
				}
				throw e;
			}
		},
		[getGoogleAccessToken, invalidateGoogleAccessToken],
	);

	const isPhysical = summary?.kind === "physical";
	const isSanityOnlyGmail = Boolean(
		summary?.loadFromSanityOnly && summary?.sanityDocumentId,
	);
	const isLiveGmail = !isPhysical && !isSanityOnlyGmail;

	useEffect(() => {
		if (!open || !summary?.id) return;
		let cancelled = false;
		setAutotraderExtras(null);
		setGmailMarkedDoneAt(summary?.gmailMarkedDoneAt ?? null);
		setError(null);
		setLoading(true);
		setBodyText("");

		const loadSanityLeadByDocId = async (sid) => {
			if (!isSanityConfigured() || cancelled) {
				if (!cancelled) setLoading(false);
				return;
			}
			const saved = await getLeadFromSanityById(sid).catch(() => null);
			if (cancelled) return;
			const plain =
				saved?.bodyText || summary.snippet || saved?.snippet || "";
			const hinted = extractContactsFromText(plain);
			const at = extractAutotraderLeadDetails({
				plain,
				html: "",
				subject: summary.subject || "",
				fromEmail: summary.fromEmail || fromEmail,
			});
			setAutotraderExtras(at.isAutotraderNotification ? at : null);
			const mergeAt =
				at.isAutotraderNotification &&
				String(summary?.source || "").toLowerCase() === "autotrader";

			setBodyText(plain);
			setLeadName(
				saved?.name ||
					(mergeAt ? at.customerName : "") ||
					summary.fromName ||
					"",
			);
			setPhone(
				saved?.phone ||
					hinted.phone ||
					(mergeAt ? at.phoneHint : "") ||
					"",
			);
			setCar(
				saved?.car || (mergeAt ? at.interestedDescription : "") || "",
			);
			setStatus(saved?.status || summary.crmStatus || "New");
			setNotes(saved?.notes || "");
			setHandledBy(saved?.handledBy || "");
			setFollowUpDate(saved?.followUpDate || "");
			setGmailMarkedDoneAt(saved?.gmailMarkedDoneAt ?? null);
		};

		if (isPhysical) {
			(async () => {
				try {
					const sid = summary.sanityDocumentId || summary.id;
					await loadSanityLeadByDocId(sid);
				} catch (e) {
					if (!cancelled) {
						setError(e?.message || "Could not load lead from CRM.");
					}
				} finally {
					if (!cancelled) setLoading(false);
				}
			})();
			return () => {
				cancelled = true;
			};
		}

		if (isSanityOnlyGmail) {
			(async () => {
				try {
					await loadSanityLeadByDocId(summary.sanityDocumentId);
				} catch (e) {
					if (!cancelled) {
						setError(e?.message || "Could not load lead from CRM.");
					}
				} finally {
					if (!cancelled) setLoading(false);
				}
			})();
			return () => {
				cancelled = true;
			};
		}

		(async () => {
			try {
				const token = await getGoogleAccessToken();
				if (!token || cancelled) {
					if (!cancelled) setLoading(false);
					return;
				}

				const savedPromise = isSanityConfigured()
					? getLeadFromSanityByMessageId(summary.id).catch(() => null)
					: Promise.resolve(null);

				const [msg, saved] = await Promise.all([
					getGmailMessage(token, summary.id, "full"),
					savedPromise,
				]);
				if (cancelled) return;

				const plain = extractPlainTextBody(msg) || summary.snippet || "";
				const html = extractHtmlBody(msg) || "";
				const headers = msg.payload?.headers || [];
				const fromRaw =
					headers.find(
						(h) => String(h.name || "").toLowerCase() === "from",
					)?.value || "";
				const parsed = parseFromHeader(fromRaw);
				const hinted = extractContactsFromText(plain);

				const at = extractAutotraderLeadDetails({
					plain,
					html,
					subject: summary.subject || "",
					fromEmail:
						parsed.email || summary.fromEmail || fromEmail || "",
				});
				setAutotraderExtras(at.isAutotraderNotification ? at : null);
				const mergeAt =
					at.isAutotraderNotification &&
					String(summary?.source || "").toLowerCase() === "autotrader";

				setBodyText(plain);
				setLeadName(
					saved?.name ||
						(mergeAt ? at.customerName : "") ||
						parsed.name ||
						summary.fromName ||
						"",
				);
				setPhone(
					saved?.phone ||
						hinted.phone ||
						(mergeAt ? at.phoneHint : "") ||
						"",
				);
				setCar(
					saved?.car || (mergeAt ? at.interestedDescription : "") || "",
				);
				setStatus(saved?.status || "New");
				setNotes(saved?.notes || "");
				setHandledBy(saved?.handledBy || "");
				setFollowUpDate(saved?.followUpDate || "");
				setGmailMarkedDoneAt(saved?.gmailMarkedDoneAt ?? null);
			} catch (e) {
				if (!cancelled) {
					setError(
						e?.code === "UNAUTHORIZED"
							? "Session expired — reconnect Google."
							: e?.message || "Could not load email.",
					);
				}
			} finally {
				if (!cancelled) setLoading(false);
			}
		})();
		return () => {
			cancelled = true;
		};
	}, [
		open,
		summary?.id,
		summary?.fromName,
		summary?.snippet,
		summary?.kind,
		summary?.sanityDocumentId,
		summary?.crmStatus,
		summary?.loadFromSanityOnly,
		summary?.gmailMarkedDoneAt,
		isPhysical,
		isSanityOnlyGmail,
		getGoogleAccessToken,
	]);

	const replyUrl = buildGmailComposeUrl(
		fromEmail,
		summary?.subject?.startsWith("Re:") ? summary.subject : `Re: ${summary?.subject || ""}`,
		"",
	);
	const waDigits = phoneToWaDigits(phone);
	const waOpenUrl = waDigits ? waMeUrlWithText(phone, "") : null;
	const isAutotrader =
		String(summary?.source || "").toLowerCase() === "autotrader";

	async function handleSaveLead() {
		if (!summary?.id) return;
		setError(null);
		setSaving(true);
		try {
			const row = {
				date:
					internalDateToSheetDate(
						isPhysical
							? Number(summary.internalDate)
							: summary.internalDate,
					) || new Date().toISOString().slice(0, 10),
				name: leadName.trim(),
				phone: phone.trim(),
				email: fromEmail.trim(),
				car: car.trim(),
				source: summary.source || "Website",
				status,
				notes: notes.trim(),
				handledBy: handledBy.trim(),
				followUpDate: followUpDate.trim(),
				subject: summary.subject || "",
				snippet: summary.snippet || notes.trim().slice(0, 200),
				bodyText: bodyText || summary.snippet || notes.trim(),
			};
			if (isPhysical) {
				row._sanityId = summary.sanityDocumentId || summary.id;
			} else {
				row.gmailMessageId = summary.id;
			}
			await upsertLeadToSanity(row);
			onSaved?.();
		} catch (e) {
			setError(formatSanityThrownError(e));
		} finally {
			setSaving(false);
		}
}

	async function handleMarkDone() {
		if (!summary?.id) return;
		if (!isSanityConfigured()) {
			setError("CRM is not configured — cannot save done state.");
			return;
		}
		setError(null);
		setMarkingDone(true);
		try {
			const iso = new Date().toISOString();
			if (isLiveGmail) {
				await withToken((t) => markMessageDone(t, summary.id));
			}
			await patchLeadGmailMarkedDone(summary.id, iso);
			setGmailMarkedDoneAt(iso);
			onSaved?.();
		} catch (e) {
			setError(
				e?.message ||
					"Could not mark done (Gmail label and CRM must both succeed for live mail).",
			);
		} finally {
			setMarkingDone(false);
		}
	}

	async function handleUndoMarkDone() {
		if (!summary?.id || !isSanityConfigured()) return;
		setError(null);
		setMarkingDone(true);
		try {
			if (isLiveGmail) {
				await withToken((t) => unmarkMessageDone(t, summary.id));
			}
			await patchLeadGmailMarkedDone(summary.id, null);
			setGmailMarkedDoneAt(null);
			onSaved?.();
		} catch (e) {
			setError(e?.message || "Could not undo mark done.");
		} finally {
			setMarkingDone(false);
		}
	}

	return (
		<AnimatePresence>
			{open && summary ? (
				<motion.div
					key={summary.id}
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
						className="relative z-10 flex max-h-[min(94vh,820px)] w-full max-w-lg flex-col rounded-t-2xl border border-slate-200/90 bg-white shadow-2xl sm:rounded-2xl"
					>
						<div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
							<div className="min-w-0">
								<div className="flex flex-wrap items-center gap-2">
									<h2 className="truncate text-lg font-semibold text-slate-900">
										{summary.subject || "(no subject)"}
									</h2>
									<span
										className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${sourcePillClass(summary.source)}`}
									>
										{summary.source}
									</span>
								</div>
								<p className="mt-1 text-sm text-slate-600">
									{summary.fromName}{" "}
									{fromEmail ? (
										<span className="text-slate-500">
											&lt;{fromEmail}&gt;
										</span>
									) : null}
								</p>
								<p className="mt-0.5 text-xs text-slate-500">
									{summary.dateLabel}
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

						<div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
							{autotraderExtras ? (
								<div className="rounded-xl border border-violet-200/80 bg-gradient-to-br from-violet-50/90 to-white p-3.5 text-sm text-violet-950 shadow-sm ring-1 ring-violet-100/80">
									<p className="text-xs font-semibold uppercase tracking-wide text-violet-800">
										Auto Trader (from email)
									</p>
									<dl className="mt-2 space-y-2 text-xs sm:text-sm">
										{autotraderExtras.customerName ? (
											<div>
												<dt className="font-medium text-violet-900/75">
													Customer
												</dt>
												<dd className="mt-0.5 text-slate-800">
													{autotraderExtras.customerName}
												</dd>
											</div>
										) : null}
										{autotraderExtras.interestedDescription ? (
											<div>
												<dt className="font-medium text-violet-900/75">
													Vehicle
												</dt>
												<dd className="mt-0.5 text-slate-800">
													{autotraderExtras.interestedDescription}
												</dd>
											</div>
										) : null}
										{(autotraderExtras.vrm ||
											autotraderExtras.price ||
											autotraderExtras.mileage ||
											autotraderExtras.colourPreference) ? (
											<div className="flex flex-wrap gap-x-3 gap-y-1 text-slate-700">
												{autotraderExtras.vrm ? (
													<span>
														<strong className="text-violet-900/80">VRM</strong>{" "}
														{autotraderExtras.vrm}
													</span>
												) : null}
												{autotraderExtras.price ? (
													<span>
														<strong className="text-violet-900/80">Price</strong>{" "}
														{autotraderExtras.price}
													</span>
												) : null}
												{autotraderExtras.mileage ? (
													<span>
														<strong className="text-violet-900/80">Mileage</strong>{" "}
														{autotraderExtras.mileage}
													</span>
												) : null}
												{autotraderExtras.colourPreference ? (
													<span>
														<strong className="text-violet-900/80">Colour</strong>{" "}
														{autotraderExtras.colourPreference}
													</span>
												) : null}
												{autotraderExtras.doors ? (
													<span>
														<strong className="text-violet-900/80">Doors</strong>{" "}
														{autotraderExtras.doors}
													</span>
												) : null}
												{autotraderExtras.upholstery ? (
													<span>
														<strong className="text-violet-900/80">Trim</strong>{" "}
														{autotraderExtras.upholstery}
													</span>
												) : null}
											</div>
										) : null}
										{(autotraderExtras.partExchangeDescription ||
											autotraderExtras.partExchangeVrm) ? (
											<div>
												<dt className="font-medium text-violet-900/75">
													Part exchange
												</dt>
												<dd className="mt-0.5 text-slate-800">
													{autotraderExtras.partExchangeDescription ||
														"—"}
													{autotraderExtras.partExchangeVrm ? (
														<span className="ml-1 text-slate-600">
															(VRM {autotraderExtras.partExchangeVrm}
															{autotraderExtras.partExchangeMileage
																? `, ${autotraderExtras.partExchangeMileage}`
																: ""}
															)
														</span>
													) : null}
												</dd>
												{autotraderExtras.partExchangeValuation ? (
													<p className="mt-1 text-xs text-slate-600">
														{autotraderExtras.partExchangeValuation}
													</p>
												) : null}
											</div>
										) : null}
									</dl>
									{(autotraderExtras.viewLeadUrl ||
										autotraderExtras.advertUrl) ? (
										<div className="mt-3 flex flex-wrap gap-2">
											{autotraderExtras.viewLeadUrl ? (
												<a
													href={autotraderExtras.viewLeadUrl}
													target="_blank"
													rel="noopener noreferrer"
													className="inline-flex items-center gap-1.5 rounded-lg bg-violet-700 px-3 py-2 text-xs font-medium text-white shadow-sm hover:bg-violet-800"
												>
													<ExternalLink className="h-3.5 w-3.5" />
													View lead
												</a>
											) : null}
											{autotraderExtras.advertUrl ? (
												<a
													href={autotraderExtras.advertUrl}
													target="_blank"
													rel="noopener noreferrer"
													className="inline-flex items-center gap-1.5 rounded-lg border border-violet-300 bg-white px-3 py-2 text-xs font-medium text-violet-900 hover:bg-violet-50"
												>
													<ExternalLink className="h-3.5 w-3.5" />
													View advert
												</a>
											) : null}
										</div>
									) : (
										<p className="mt-2 text-xs text-violet-800/80">
											Open the raw message below if links did not appear
											(depends on how Gmail exposes HTML).
										</p>
									)}
								</div>
							) : null}
							<div>
								<p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">
									{isLiveGmail ? "Message" : "Details"}
								</p>
								{loading ? (
									<div className="flex items-center gap-2 py-8 text-sm text-slate-500">
										<Loader2 className="h-5 w-5 animate-spin" />
										{isLiveGmail ? "Loading email…" : "Loading…"}
									</div>
								) : (
									<pre className="max-h-48 overflow-y-auto whitespace-pre-wrap break-words rounded-xl border border-slate-200 bg-slate-50/80 p-3 text-sm text-slate-800">
										{bodyText || summary.snippet || "—"}
									</pre>
								)}
							</div>

							<div className="grid gap-3 sm:grid-cols-2">
								<div className="sm:col-span-2">
									<label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
										Name
									</label>
									<input
										value={leadName}
										onChange={(e) => setLeadName(e.target.value)}
										className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-900/10"
									/>
								</div>
								<div>
									<label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
										Phone
									</label>
									<input
										value={phone}
										onChange={(e) => setPhone(e.target.value)}
										className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-900/10"
									/>
								</div>
								<div>
									<label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
										Car
									</label>
									<input
										value={car}
										onChange={(e) => setCar(e.target.value)}
										className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-900/10"
									/>
								</div>
								<div>
									<label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
										Status
									</label>
									<select
										value={status}
										onChange={(e) => setStatus(e.target.value)}
										className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-slate-900/10"
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
									<label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
										Follow-up date
									</label>
									<input
										type="date"
										value={followUpDate}
										onChange={(e) => setFollowUpDate(e.target.value)}
										className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-900/10"
									/>
								</div>
								<div className="sm:col-span-2">
									<label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
										Handled by
									</label>
									<input
										value={handledBy}
										onChange={(e) => setHandledBy(e.target.value)}
										placeholder="Staff name"
										className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-900/10"
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
										className="w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-900/10"
									/>
								</div>
							</div>

							<div className="flex flex-wrap gap-2">
								{waOpenUrl ? (
									<a
										href={waOpenUrl}
										target="_blank"
										rel="noopener noreferrer"
										className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-700"
									>
										<MessageCircle className="h-4 w-4" />
										Send WhatsApp
									</a>
								) : (
									<p className="w-full text-xs text-amber-800">
										Add a phone number to open WhatsApp.
									</p>
								)}
								{isLiveGmail && replyUrl ? (
									<a
										href={replyUrl}
										target="_blank"
										rel="noopener noreferrer"
										className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 shadow-sm hover:border-slate-300"
									>
										<Mail className="h-4 w-4 text-sky-600" />
										Reply by email
									</a>
								) : null}
								{isAutotrader ? (
									<a
										href={AUTOTRADER_PORTAL}
										target="_blank"
										rel="noopener noreferrer"
										className="inline-flex items-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-3 py-2 text-sm font-medium text-violet-900 hover:bg-violet-100/80"
									>
										<CarFront className="h-4 w-4" />
										Open Autotrader portal
									</a>
								) : null}
								{(isLiveGmail || isSanityOnlyGmail) &&
								isSanityConfigured() ? (
									gmailMarkedDoneAt ? (
										<motion.button
											type="button"
											whileTap={{ scale: 0.99 }}
											disabled={markingDone}
											onClick={() => handleUndoMarkDone()}
											className="inline-flex items-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-900 hover:bg-emerald-100/80 disabled:opacity-60"
										>
											{markingDone ? (
												<Loader2 className="h-4 w-4 animate-spin" />
											) : (
												<RotateCcw className="h-4 w-4" />
											)}
											Undo mark done
										</motion.button>
									) : (
										<motion.button
											type="button"
											whileTap={{ scale: 0.99 }}
											disabled={markingDone}
											onClick={() => handleMarkDone()}
											className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-slate-100 px-3 py-2 text-sm font-medium text-slate-900 hover:bg-slate-200/80 disabled:opacity-60"
										>
											{markingDone ? (
												<Loader2 className="h-4 w-4 animate-spin" />
											) : (
												<CheckCircle className="h-4 w-4" />
											)}
											Mark as Done
										</motion.button>
									)
								) : null}
							</div>
							{gmailMarkedDoneAt ? (
								<p className="text-xs font-medium text-emerald-800">
									Marked done in CRM
									{isLiveGmail ? " and Gmail (DONE AT)" : ""}{" "}
									·{" "}
									{new Date(gmailMarkedDoneAt).toLocaleString(undefined, {
										dateStyle: "medium",
										timeStyle: "short",
									})}
								</p>
							) : null}
							{isLiveGmail ? (
								<>
									<p className="text-xs text-slate-500">
										&quot;Mark as Done&quot; adds the Gmail label{" "}
										<strong>DONE AT</strong> and saves the time in the CRM
										(Sanity) so the list can show it after refresh. Use{" "}
										<strong>Undo</strong> to remove both.
									</p>
									<p className="text-xs text-slate-500">
										Gmail labels:{" "}
										<strong>
											{GMAIL_LEAD_LABELS.map((l) => l.gmailName).join(
												" · ",
											)}
										</strong>
										.
									</p>
								</>
							) : isSanityOnlyGmail ? (
								<p className="text-xs text-slate-500">
									CRM copy of a Gmail lead — mark done updates CRM only.
									Use <strong>Save & sync</strong> after other edits.
								</p>
							) : (
								<p className="text-xs text-slate-500">
									Physical lead — stored only in CRM (Sanity). Use{" "}
									<strong>Save & sync</strong> after edits.
								</p>
							)}

							{error && (
								<p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800 ring-1 ring-rose-200/80">
									{error}
								</p>
							)}
						</div>

						<div className="border-t border-slate-100 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
							<motion.button
								type="button"
								whileTap={{ scale: 0.99 }}
								disabled={saving || !summary.id || !isSanityConfigured()}
								onClick={() => handleSaveLead()}
								className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-white shadow-lg shadow-slate-900/15 hover:bg-slate-800 disabled:opacity-60"
							>
								<Save className="h-4 w-4" />
								{saving ? "Saving…" : "Save & sync to CRM"}
							</motion.button>
						</div>
					</motion.div>
				</motion.div>
			) : null}
		</AnimatePresence>
	);
}
