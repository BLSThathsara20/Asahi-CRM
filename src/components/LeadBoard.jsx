import { motion } from "framer-motion";
import { RefreshCw, Search } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { fetchLeadsRaw, parseLeads } from "../services/sheetsApi.js";
import { StatusBadge } from "./StatusBadge.jsx";

export function LeadBoard({ onSelectLead, refreshKey = 0 }) {
	const { getSheetsAccessToken, refreshSheetsToken } = useAuth();
	const [leads, setLeads] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [search, setSearch] = useState("");
	const [sourceFilter, setSourceFilter] = useState("");
	const [statusFilter, setStatusFilter] = useState("");

	const loadLeads = useCallback(async () => {
		setError(null);
		setLoading(true);
		try {
			let token = await getSheetsAccessToken();
			let rows;
			try {
				rows = await fetchLeadsRaw(token);
			} catch (e) {
				if (e?.code === "UNAUTHORIZED" || e?.message === "UNAUTHORIZED") {
					token = await refreshSheetsToken();
					rows = await fetchLeadsRaw(token);
				} else {
					throw e;
				}
			}
			setLeads(parseLeads(rows));
		} catch (e) {
			setError(e?.message || "Could not load leads");
			setLeads([]);
		} finally {
			setLoading(false);
		}
	}, [getSheetsAccessToken, refreshSheetsToken]);

	useEffect(() => {
		loadLeads();
	}, [loadLeads, refreshKey]);

	const sourceOptions = useMemo(() => {
		const s = new Set();
		for (const l of leads) {
			if (l.source) s.add(l.source);
		}
		return Array.from(s).sort();
	}, [leads]);

	const filtered = useMemo(() => {
		const q = search.trim().toLowerCase();
		return leads.filter((l) => {
			if (sourceFilter && l.source !== sourceFilter) return false;
			if (statusFilter && l.status !== statusFilter) return false;
			if (!q) return true;
			const name = (l.name || "").toLowerCase();
			const phone = (l.phone || "").toLowerCase().replace(/\s/g, "");
			const qPhone = q.replace(/\s/g, "");
			return name.includes(q) || phone.includes(qPhone);
		});
	}, [leads, search, sourceFilter, statusFilter]);

	return (
		<div className="flex flex-col gap-4">
			<div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
				<div className="relative min-w-0 flex-1 sm:max-w-xs">
					<Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
					<input
						type="search"
						placeholder="Search name or phone…"
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-900 shadow-sm outline-none ring-slate-900/5 transition-[box-shadow,border-color] focus:border-slate-300 focus:ring-2 focus:ring-slate-900/10"
					/>
				</div>
				<div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
					<select
						value={sourceFilter}
						onChange={(e) => setSourceFilter(e.target.value)}
						className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none ring-slate-900/5 focus:border-slate-300 focus:ring-2 focus:ring-slate-900/10"
					>
						<option value="">All sources</option>
						{sourceOptions.map((s) => (
							<option key={s} value={s}>
								{s}
							</option>
						))}
					</select>
					<select
						value={statusFilter}
						onChange={(e) => setStatusFilter(e.target.value)}
						className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none ring-slate-900/5 focus:border-slate-300 focus:ring-2 focus:ring-slate-900/10"
					>
						<option value="">All statuses</option>
						<option value="New">New</option>
						<option value="Contacted">Contacted</option>
						<option value="Follow-up">Follow-up</option>
						<option value="Sold">Sold</option>
						<option value="Lost">Lost</option>
					</select>
				</div>
				<motion.button
					type="button"
					whileTap={{ scale: 0.98 }}
					onClick={() => loadLeads()}
					disabled={loading}
					className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-800 shadow-sm transition-[box-shadow] hover:border-slate-300 disabled:opacity-60 sm:shrink-0"
				>
					<RefreshCw
						className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
					/>
					Refresh
				</motion.button>
			</div>

			{error && (
				<p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-800 ring-1 ring-rose-200/80">
					{error}
				</p>
			)}

			{/* Desktop table */}
			<div className="hidden md:block overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm">
				<div className="max-h-[calc(100vh-16rem)] overflow-auto">
					<table className="w-full min-w-[800px] border-collapse text-left text-sm">
						<thead className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur-sm">
							<tr className="border-b border-slate-200 text-xs font-semibold uppercase tracking-wide text-slate-500">
								<th className="px-4 py-3">Date</th>
								<th className="px-4 py-3">Name</th>
								<th className="px-4 py-3">Phone</th>
								<th className="px-4 py-3">Email</th>
								<th className="px-4 py-3">Car</th>
								<th className="px-4 py-3">Source</th>
								<th className="px-4 py-3">Status</th>
							</tr>
						</thead>
						<tbody>
							{loading ? (
								<tr>
									<td colSpan={7} className="px-4 py-12 text-center text-slate-500">
										Loading leads…
									</td>
								</tr>
							) : filtered.length === 0 ? (
								<tr>
									<td colSpan={7} className="px-4 py-12 text-center text-slate-500">
										No leads match your filters.
									</td>
								</tr>
							) : (
								filtered.map((lead, i) => (
									<motion.tr
										key={`${lead.sheetRow}-${i}`}
										initial={{ opacity: 0 }}
										animate={{ opacity: 1 }}
										transition={{ delay: Math.min(i * 0.02, 0.3) }}
										onClick={() => onSelectLead(lead)}
										className="cursor-pointer border-b border-slate-100 transition-colors hover:bg-slate-50/80"
									>
										<td className="whitespace-nowrap px-4 py-3 text-slate-700">
											{lead.date}
										</td>
										<td className="px-4 py-3 font-medium text-slate-900">
											{lead.name}
										</td>
										<td className="whitespace-nowrap px-4 py-3 text-slate-600">
											{lead.phone}
										</td>
										<td className="max-w-[180px] truncate px-4 py-3 text-slate-600">
											{lead.email}
										</td>
										<td className="max-w-[160px] truncate px-4 py-3 text-slate-600">
											{lead.car}
										</td>
										<td className="whitespace-nowrap px-4 py-3 text-slate-600">
											{lead.source}
										</td>
										<td className="px-4 py-3">
											<StatusBadge status={lead.status} />
										</td>
									</motion.tr>
								))
							)}
						</tbody>
					</table>
				</div>
			</div>

			{/* Mobile cards */}
			<div className="md:hidden space-y-3 pb-24">
				{loading ? (
					<p className="py-8 text-center text-sm text-slate-500">
						Loading leads…
					</p>
				) : filtered.length === 0 ? (
					<p className="py-8 text-center text-sm text-slate-500">
						No leads match your filters.
					</p>
				) : (
					filtered.map((lead, i) => (
						<motion.button
							type="button"
							key={`${lead.sheetRow}-m-${i}`}
							initial={{ opacity: 0, y: 6 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ delay: Math.min(i * 0.03, 0.25) }}
							onClick={() => onSelectLead(lead)}
							className="w-full rounded-2xl border border-slate-200/90 bg-white p-4 text-left shadow-sm transition-[box-shadow,transform] active:scale-[0.99]"
						>
							<div className="flex items-start justify-between gap-2">
								<div>
									<p className="font-semibold text-slate-900">
										{lead.name || "—"}
									</p>
									<p className="mt-0.5 text-xs text-slate-500">
										{lead.date} · {lead.source}
									</p>
								</div>
								<StatusBadge status={lead.status} />
							</div>
							<p className="mt-2 text-sm text-slate-600">{lead.car}</p>
							<p className="mt-1 text-sm text-slate-500">{lead.phone}</p>
						</motion.button>
					))
				)}
			</div>
		</div>
	);
}
