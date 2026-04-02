import { motion } from "framer-motion";
import {
	Bell,
	CheckCircle,
	Inbox,
	Mail,
	RefreshCw,
	Search,
	Store,
	UserRound,
} from "lucide-react";
import {
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import {
	DASHBOARD_SOURCE_TABS,
	GMAIL_LEAD_LABELS,
} from "../constants.js";
import { useAuth } from "../context/AuthContext.jsx";
import { fetchGmailLeadsForLabels } from "../services/gmailLeadsApi.js";
import {
	fetchAllLeadDocuments,
	isSanityConfigured,
	sanityDocumentToBoardRow,
	sanityDocumentToCrmOnlyBoardRow,
} from "../services/sanityLeadsApi.js";
import { promiseWithTimeout } from "../utils/promiseTimeout.js";
import { formatSheetsThrownError } from "../utils/sheetsErrors.js";
import {
	getLeadRowHighlight,
	leadCardSurfaceClass,
	leadRowSurfaceClass,
} from "../utils/leadRowHighlight.js";
import { sourcePillClass } from "../utils/leadSources.js";
import { slicePage, totalPages } from "../utils/pagination.js";
import { PaginationControls } from "./PaginationControls.jsx";
import { StatusBadge } from "./StatusBadge.jsx";

const LEADS_PAGE_SIZE = 20;

function TodayBell({ show, className = "h-4 w-4" }) {
	if (!show) return null;
	return (
		<Bell
			className={`lead-notify-bell shrink-0 text-amber-600 ${className}`}
			aria-label="Arrived today"
		/>
	);
}

function ChannelIcon({ kind }) {
	if (kind === "physical") {
		return (
			<span
				className="inline-flex items-center gap-1 rounded-lg bg-amber-50 px-2 py-1 text-xs font-medium text-amber-900 ring-1 ring-amber-200/80"
				title="Manual / physical lead"
			>
				<Store className="h-3.5 w-3.5 shrink-0" />
				Manual
			</span>
		);
	}
	return (
		<span
			className="inline-flex items-center gap-1 rounded-lg bg-slate-50 px-2 py-1 text-xs font-medium text-slate-700 ring-1 ring-slate-200/90"
			title="From Gmail"
		>
			<Mail className="h-3.5 w-3.5 shrink-0" />
			Gmail
		</span>
	);
}

function SyncStatePill({ savedInCrm, kind, gmailMarkedDoneAt }) {
	if (kind === "gmail" && gmailMarkedDoneAt) {
		return (
			<span
				className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-2.5 py-0.5 text-[11px] font-semibold text-white shadow-sm ring-1 ring-emerald-700/40"
				title="Marked done (Gmail + CRM)"
			>
				<CheckCircle className="h-3.5 w-3.5 shrink-0 opacity-95" />
				Done
			</span>
		);
	}
	if (kind === "physical" || savedInCrm) {
		return (
			<span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-200/90">
				<span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
				In CRM
			</span>
		);
	}
	return (
		<span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-900 ring-1 ring-amber-200/80">
			<span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
			Pending sync
		</span>
	);
}

export function LeadBoard({
	onSelectLead,
	refreshKey = 0,
	includeGmailInbox = true,
}) {
	const { getGoogleAccessToken, invalidateGoogleAccessToken } = useAuth();
	const [leads, setLeads] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [search, setSearch] = useState("");
	const [sourceFilter, setSourceFilter] = useState("");
	const [page, setPage] = useState(1);
	const prevRefreshKeyRef = useRef(null);

	const loadLeads = useCallback(
		async ({ silent = false } = {}) => {
			if (!silent) {
				setError(null);
				setLoading(true);
			}
			try {
				if (!includeGmailInbox) {
					if (!isSanityConfigured()) {
						if (!silent) {
							setError("CRM is not configured.");
						}
						setLeads([]);
						return;
					}
					const sanityDocs = await promiseWithTimeout(
						fetchAllLeadDocuments(),
						45_000,
						"Sanity request timed out",
					).catch((e) => {
						if (!silent) {
							console.warn("[LeadBoard] Sanity:", e);
							setError(
								"Could not load CRM data in time. Check your network and try Refresh.",
							);
						}
						return [];
					});
					const rows = (sanityDocs || [])
						.map((d) => sanityDocumentToCrmOnlyBoardRow(d))
						.filter(Boolean);
					rows.sort((a, b) => {
						const nb = Number(b.internalDate) || 0;
						const na = Number(a.internalDate) || 0;
						return nb - na;
					});
					setLeads(rows);
					return;
				}

				const token = await getGoogleAccessToken();
				if (!token) {
					invalidateGoogleAccessToken();
					setLeads([]);
					return;
				}

				const [gmailLeads, sanityDocs] = await Promise.all([
					promiseWithTimeout(
						fetchGmailLeadsForLabels(token, GMAIL_LEAD_LABELS, {
							maxPerLabel: 50,
						}),
						120_000,
						"Gmail request timed out",
					).catch((e) => {
						if (!silent) {
							console.warn("[LeadBoard] Gmail:", e);
							setError(
								e?.message?.includes("timed out")
									? "Gmail took too long. Try Refresh, or check labels and API access."
									: formatSheetsThrownError(e) ||
										"Could not load Gmail. Check labels and API scopes.",
							);
						}
						return [];
					}),
					isSanityConfigured()
						? promiseWithTimeout(
								fetchAllLeadDocuments(),
								45_000,
								"Sanity request timed out",
							).catch((e) => {
								if (!silent) {
									console.warn("[LeadBoard] Sanity:", e);
								}
								return [];
							})
						: Promise.resolve([]),
				]);

				const byGmail = new Map();
				const physicalRows = [];
				for (const doc of sanityDocs || []) {
					const gid = String(doc.gmailMessageId ?? "").trim();
					if (gid) byGmail.set(gid, doc);
					else {
						const row = sanityDocumentToBoardRow(doc);
						if (row) physicalRows.push(row);
					}
				}

				const mergedGmail = gmailLeads.map((g) => {
					const doc = byGmail.get(g.id);
					return {
						...g,
						kind: "gmail",
						savedInCrm: Boolean(doc),
						crmStatus: doc?.status || null,
						gmailMarkedDoneAt: doc?.gmailMarkedDoneAt || null,
					};
				});

				const merged = [...mergedGmail, ...physicalRows];
				merged.sort((a, b) => {
					const nb = Number(b.internalDate) || 0;
					const na = Number(a.internalDate) || 0;
					return nb - na;
				});
				setLeads(merged);
			} catch (e) {
				if (silent) {
					console.warn("[LeadBoard] Background refresh failed:", e);
					return;
				}
				if (e?.code === "UNAUTHORIZED" || e?.message === "UNAUTHORIZED") {
					invalidateGoogleAccessToken();
					setLeads([]);
					return;
				}
				setError(
					formatSheetsThrownError(e) ||
						"Could not load Gmail. Check labels and API scopes.",
				);
				setLeads([]);
			} finally {
				if (!silent) setLoading(false);
			}
		},
		[getGoogleAccessToken, invalidateGoogleAccessToken, includeGmailInbox],
	);

	useEffect(() => {
		const silent =
			prevRefreshKeyRef.current !== null &&
			refreshKey !== prevRefreshKeyRef.current;
		prevRefreshKeyRef.current = refreshKey;
		loadLeads({ silent });
	}, [refreshKey, loadLeads]);

	useEffect(() => {
		if (!includeGmailInbox) return;
		const id = setInterval(
			() => loadLeads({ silent: true }),
			3 * 60 * 1000,
		);
		return () => clearInterval(id);
	}, [includeGmailInbox, loadLeads]);

	const filtered = useMemo(() => {
		const q = search.trim().toLowerCase();
		return leads.filter((l) => {
			if (sourceFilter === "__physical__") {
				if (l.kind !== "physical") return false;
			} else if (sourceFilter && l.source !== sourceFilter) {
				return false;
			}
			if (!q) return true;
			const blob = [
				l.fromName,
				l.fromEmail,
				l.subject,
				l.snippet,
				l.source,
				l.kind,
			]
				.join(" ")
				.toLowerCase();
			return blob.includes(q);
		});
	}, [leads, search, sourceFilter]);

	useEffect(() => {
		setPage(1);
	}, [search, sourceFilter]);

	useEffect(() => {
		const pc = totalPages(filtered.length, LEADS_PAGE_SIZE);
		setPage((p) => Math.min(p, pc));
	}, [filtered.length]);

	const kpis = useMemo(() => {
		let gmail = 0;
		let physical = 0;
		let synced = 0;
		let gmailPendingSync = 0;
		for (const l of leads) {
			if (l.kind === "physical") physical += 1;
			else gmail += 1;
			if (l.savedInCrm) synced += 1;
			if (l.kind === "gmail" && !l.savedInCrm) gmailPendingSync += 1;
		}
		return {
			total: leads.length,
			gmail,
			physical,
			synced,
			gmailPendingSync,
		};
	}, [leads]);

	const filteredSync = useMemo(() => {
		let s = 0;
		for (const l of filtered) if (l.savedInCrm) s += 1;
		return s;
	}, [filtered]);

	const filteredHighlightCounts = useMemo(() => {
		let today = 0;
		let pendingGmail = 0;
		let crmNew = 0;
		let sold = 0;
		let lost = 0;
		let inboxDone = 0;
		for (const l of filtered) {
			const h = getLeadRowHighlight(l);
			if (h.showTodayBell) today += 1;
			if (l.kind === "gmail" && !l.savedInCrm) pendingGmail += 1;
			if (h.variant === "crmNew") crmNew += 1;
			if (h.variant === "inboxDone") inboxDone += 1;
			if (h.variant === "sold") sold += 1;
			if (h.variant === "lost") lost += 1;
		}
		return { today, pendingGmail, crmNew, sold, lost, inboxDone };
	}, [filtered]);

	const pageCount = totalPages(filtered.length, LEADS_PAGE_SIZE);
	const safePage = Math.min(page, pageCount);
	const paged = useMemo(
		() => slicePage(filtered, safePage, LEADS_PAGE_SIZE),
		[filtered, safePage],
	);

	return (
		<div className="flex flex-col gap-6">
			{/* KPI strip */}
			<div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
				<motion.div
					initial={{ opacity: 0, y: 6 }}
					animate={{ opacity: 1, y: 0 }}
					className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm"
				>
					<p className="text-xs font-medium uppercase tracking-wide text-slate-500">
						Pipeline
					</p>
					<p className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">
						{kpis.total}
					</p>
					<p className="mt-0.5 text-xs text-slate-500">All leads</p>
				</motion.div>
				<div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm">
					<p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-slate-500">
						<Inbox className="h-3.5 w-3.5" />
						Gmail
					</p>
					<p className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">
						{kpis.gmail}
					</p>
					<p className="mt-0.5 text-xs text-slate-500">
						{includeGmailInbox ? "Label inboxes" : "Saved in CRM"}
					</p>
				</div>
				<div className="rounded-2xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50/90 to-white p-4 shadow-sm">
					<p className="text-xs font-medium uppercase tracking-wide text-emerald-800/90">
						In CRM
					</p>
					<p className="mt-1 text-2xl font-semibold tabular-nums text-emerald-950">
						{kpis.synced}
					</p>
					<p className="mt-0.5 text-xs text-emerald-900/80">
						Synced to Sanity
					</p>
				</div>
				<div className="rounded-2xl border border-amber-200/80 bg-gradient-to-br from-amber-50/90 to-white p-4 shadow-sm">
					<p className="text-xs font-medium uppercase tracking-wide text-amber-900/90">
						Action
					</p>
					<p className="mt-1 text-2xl font-semibold tabular-nums text-amber-950">
						{kpis.gmailPendingSync}
					</p>
					<p className="mt-0.5 text-xs text-amber-900/80">
						Gmail pending sync
					</p>
				</div>
			</div>

			<div className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-4 text-sm text-slate-600">
				<p className="font-medium text-slate-800">How leads arrive</p>
				<ul className="mt-2 list-inside list-disc space-y-1 text-xs sm:text-sm">
					{includeGmailInbox ? (
						<li>
							<strong>Autotrader, Website, Car dealer</strong> — Gmail labels{" "}
							<code className="rounded bg-white px-1">
								{GMAIL_LEAD_LABELS.map((x) => x.gmailName).join(" · ")}
							</code>
							. Open a row to complete details and{" "}
							<strong>sync to CRM</strong>.
						</li>
					) : (
						<li>
							This view lists <strong>CRM-saved leads only</strong> (including
							any originally from Gmail). Live inbox sync requires a company
							email sign-in.
						</li>
					)}
					<li>
						<strong>Physical</strong> — use{" "}
						<strong>Add physical lead</strong> for showroom or phone-ins;
						they appear here and live only in Sanity.
					</li>
				</ul>
			</div>

			{/* Source tabs + toolbar */}
			<div className="flex flex-col gap-4">
				<div className="-mx-1 flex gap-1 overflow-x-auto pb-1 sm:flex-wrap">
					{DASHBOARD_SOURCE_TABS.map((tab) => (
						<button
							key={tab.value || "all"}
							type="button"
							onClick={() => setSourceFilter(tab.value)}
							className={`shrink-0 rounded-full px-3.5 py-2 text-xs font-medium transition-colors sm:text-sm ${
								sourceFilter === tab.value
									? "bg-slate-900 text-white shadow-md shadow-slate-900/20"
									: "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
							}`}
						>
							{tab.label}
						</button>
					))}
				</div>

				<div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
					<div className="relative min-w-0 flex-1 sm:max-w-sm">
						<Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
						<input
							type="search"
							placeholder="Search name, email, subject…"
							value={search}
							onChange={(e) => setSearch(e.target.value)}
							className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-900 shadow-sm outline-none focus:ring-2 focus:ring-slate-900/10"
						/>
					</div>
					<motion.button
						type="button"
						whileTap={{ scale: 0.98 }}
						onClick={() => loadLeads({ silent: false })}
						disabled={loading}
						className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-800 shadow-sm hover:border-slate-300 disabled:opacity-60"
					>
						<RefreshCw
							className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
						/>
						Refresh
					</motion.button>
				</div>
			</div>

			{error && (
				<p
					role="alert"
					className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-800 ring-1 ring-rose-200/80"
				>
					{error}
				</p>
			)}

			{!loading && leads.length === 0 && !error && (
				<p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-950 ring-1 ring-amber-200/80">
					{includeGmailInbox
						? `No leads yet. Add Gmail labels (${GMAIL_LEAD_LABELS.map((x) => x.gmailName).join(", ")}) or create a physical lead.`
						: "No leads in the CRM yet. Saved Gmail and physical leads will appear here."}
				</p>
			)}

			{!loading && leads.length > 0 && (
				<div className="flex flex-col gap-2 text-xs text-slate-600 sm:text-sm">
					<div className="flex flex-wrap items-center gap-2">
						<span className="font-medium text-slate-800">This view</span>
						<span className="rounded-full bg-slate-100 px-2.5 py-1 font-medium">
							{filtered.length} leads
						</span>
						<span className="rounded-full bg-emerald-50 px-2.5 py-1 font-medium text-emerald-900 ring-1 ring-emerald-100">
							{filteredSync} in CRM
							{sourceFilter || search ? " (filtered)" : ""}
						</span>
						Use{" "}
						<strong className="font-semibold text-slate-800">
							Add physical lead
						</strong>{" "}
						(header) for walk-ins.
					</div>
					{filteredHighlightCounts.today > 0 ||
					filteredHighlightCounts.pendingGmail > 0 ||
					filteredHighlightCounts.crmNew > 0 ||
					filteredHighlightCounts.inboxDone > 0 ||
					filteredHighlightCounts.sold > 0 ||
					filteredHighlightCounts.lost > 0 ? (
						<div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-slate-600">
							{filteredHighlightCounts.today > 0 ? (
								<span className="inline-flex items-center gap-1.5">
									<Bell className="lead-notify-bell h-3.5 w-3.5 text-amber-600" />
									<span>
										<strong className="text-slate-800">
											{filteredHighlightCounts.today}
										</strong>{" "}
										today
									</span>
								</span>
							) : null}
							{filteredHighlightCounts.pendingGmail > 0 ? (
								<span>
									<span className="mr-1 inline-block h-2 w-2 rounded-full bg-amber-500 align-middle" />
									<strong className="text-slate-800">
										{filteredHighlightCounts.pendingGmail}
									</strong>{" "}
									not in CRM yet
								</span>
							) : null}
							{filteredHighlightCounts.crmNew > 0 ? (
								<span>
									<span className="mr-1 inline-block h-2 w-2 rounded-full bg-violet-400 align-middle" />
									<strong className="text-slate-800">
										{filteredHighlightCounts.crmNew}
									</strong>{" "}
									stage &quot;New&quot;
								</span>
							) : null}
							{filteredHighlightCounts.inboxDone > 0 ? (
								<span className="inline-flex items-center gap-1">
									<CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
									<span>
										<strong className="text-slate-800">
											{filteredHighlightCounts.inboxDone}
										</strong>{" "}
										inbox done
									</span>
								</span>
							) : null}
							{filteredHighlightCounts.sold > 0 ? (
								<span>
									<span className="mr-1 inline-block h-2 w-2 rounded-full bg-emerald-500 align-middle" />
									<strong className="text-slate-800">
										{filteredHighlightCounts.sold}
									</strong>{" "}
									done / sold
								</span>
							) : null}
							{filteredHighlightCounts.lost > 0 ? (
								<span>
									<span className="mr-1 inline-block h-2 w-2 rounded-full bg-emerald-300 align-middle" />
									<strong className="text-slate-800">
										{filteredHighlightCounts.lost}
									</strong>{" "}
									closed (lost)
								</span>
							) : null}
						</div>
					) : null}
				</div>
			)}

			{/* Desktop table */}
			<div className="hidden overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm md:block">
				<div className="max-h-[calc(100vh-12rem)] overflow-auto">
					<table className="w-full min-w-[1040px] border-collapse text-left text-sm">
						<thead className="sticky top-0 z-10 bg-slate-100/95 backdrop-blur-sm">
							<tr className="border-b border-slate-200 text-xs font-semibold uppercase tracking-wide text-slate-500">
								<th className="px-4 py-3">Date</th>
								<th className="px-4 py-3">Channel</th>
								<th className="px-4 py-3">From</th>
								<th className="px-4 py-3">Email</th>
								<th className="min-w-[180px] px-4 py-3">Subject</th>
								<th className="max-w-[160px] px-4 py-3">Preview</th>
								<th className="px-4 py-3">Source</th>
								<th className="px-4 py-3">Stage</th>
								<th className="px-4 py-3">CRM</th>
							</tr>
						</thead>
						<tbody>
							{loading ? (
								<tr>
									<td
										colSpan={9}
										className="px-4 py-14 text-center text-slate-500"
									>
										Loading…
									</td>
								</tr>
							) : filtered.length === 0 ? (
								<tr>
									<td
										colSpan={9}
										className="px-4 py-14 text-center text-slate-500"
									>
										No leads match your filters.
									</td>
								</tr>
							) : (
								paged.map((lead, i) => {
									const hi = getLeadRowHighlight(lead);
									return (
									<motion.tr
										key={lead.id}
										initial={{ opacity: 0 }}
										animate={{ opacity: 1 }}
										transition={{ delay: Math.min(i * 0.015, 0.2) }}
										onClick={() => onSelectLead(lead)}
										className={`cursor-pointer transition-colors ${leadRowSurfaceClass(
											hi.variant,
										)}`}
									>
										<td className="whitespace-nowrap px-4 py-3.5 text-slate-600">
											<div className="flex items-center gap-2">
												<TodayBell show={hi.showTodayBell} />
												<span>{lead.dateLabel}</span>
											</div>
										</td>
										<td className="px-4 py-3.5">
											<ChannelIcon kind={lead.kind} />
										</td>
										<td className="px-4 py-3.5 font-medium text-slate-900">
											<div className="flex items-center gap-2">
												{lead.kind === "physical" ? (
													<UserRound className="h-4 w-4 shrink-0 text-amber-600" />
												) : null}
												{lead.fromName || "—"}
											</div>
										</td>
										<td className="max-w-[140px] truncate px-4 py-3.5 text-slate-600">
											{lead.fromEmail || "—"}
										</td>
										<td className="px-4 py-3.5 text-slate-800">
											{lead.subject}
										</td>
										<td className="max-w-[160px] truncate px-4 py-3.5 text-xs text-slate-500">
											{lead.snippet}
										</td>
										<td className="px-4 py-3.5">
											<span
												className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${sourcePillClass(lead.source)}`}
											>
												{lead.source}
											</span>
										</td>
										<td className="px-4 py-3.5">
											{lead.savedInCrm && lead.crmStatus ? (
												<StatusBadge status={lead.crmStatus} />
											) : (
												<span className="text-xs text-slate-400">—</span>
											)}
										</td>
										<td className="px-4 py-3.5">
											<SyncStatePill
												savedInCrm={lead.savedInCrm}
												kind={lead.kind}
												gmailMarkedDoneAt={
													lead.gmailMarkedDoneAt
												}
											/>
										</td>
									</motion.tr>
									);
								})
							)}
						</tbody>
					</table>
				</div>
				{filtered.length > 0 && (
					<div className="border-t border-slate-100 bg-slate-50/60 px-4 py-3">
						<PaginationControls
							page={safePage}
							pageCount={pageCount}
							totalItems={filtered.length}
							pageSize={LEADS_PAGE_SIZE}
							onPageChange={setPage}
							itemLabel="leads"
						/>
					</div>
				)}
			</div>

			{/* Mobile cards */}
			<div className="space-y-3 pb-24 md:hidden">
				{loading ? (
					<p className="py-10 text-center text-sm text-slate-500">
						Loading…
					</p>
				) : filtered.length === 0 ? (
					<p className="py-10 text-center text-sm text-slate-500">
						No leads match your filters.
					</p>
				) : (
					paged.map((lead, i) => {
						const hi = getLeadRowHighlight(lead);
						return (
						<motion.button
							type="button"
							key={lead.id}
							initial={{ opacity: 0, y: 8 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ delay: Math.min(i * 0.025, 0.2) }}
							onClick={() => onSelectLead(lead)}
							className={`w-full rounded-2xl border p-4 text-left shadow-sm active:scale-[0.99] ${leadCardSurfaceClass(
								hi.variant,
							)}`}
						>
							<div className="flex items-start justify-between gap-2">
								<div className="min-w-0">
									<div className="flex flex-wrap items-center gap-2">
										<ChannelIcon kind={lead.kind} />
										<SyncStatePill
											savedInCrm={lead.savedInCrm}
											kind={lead.kind}
											gmailMarkedDoneAt={
												lead.gmailMarkedDoneAt
											}
										/>
										<TodayBell show={hi.showTodayBell} className="h-3.5 w-3.5" />
									</div>
									<p className="mt-2 font-semibold text-slate-900">
										{lead.fromName || lead.fromEmail || "Lead"}
									</p>
									<p className="text-xs text-slate-500">{lead.dateLabel}</p>
								</div>
								<span
									className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${sourcePillClass(lead.source)}`}
								>
									{lead.source}
								</span>
							</div>
							<p className="mt-2 line-clamp-2 text-sm font-medium text-slate-800">
								{lead.subject}
							</p>
							<p className="mt-1 line-clamp-2 text-xs text-slate-600">
								{lead.snippet}
							</p>
							{lead.savedInCrm && lead.crmStatus ? (
								<div className="mt-2">
									<StatusBadge status={lead.crmStatus} />
								</div>
							) : null}
						</motion.button>
						);
					})
				)}
				{filtered.length > 0 && (
					<PaginationControls
						page={safePage}
						pageCount={pageCount}
						totalItems={filtered.length}
						pageSize={LEADS_PAGE_SIZE}
						onPageChange={setPage}
						itemLabel="leads"
					/>
				)}
			</div>
		</div>
	);
}
