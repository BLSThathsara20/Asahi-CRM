/** @param {unknown} lead */
function internalMillis(lead) {
	const n = Number(lead?.internalDate);
	return Number.isFinite(n) && n > 0 ? n : null;
}

/** Local-calendar “today” for the dealer view. */
export function isLeadFromToday(lead) {
	const t = internalMillis(lead);
	if (t == null) return false;
	const d = new Date(t);
	const now = new Date();
	return (
		d.getFullYear() === now.getFullYear() &&
		d.getMonth() === now.getMonth() &&
		d.getDate() === now.getDate()
	);
}

/**
 * Row emphasis for pipeline scanning.
 * @returns {{
 *   variant: 'inboxDone' | 'sold' | 'lost' | 'newTodayPending' | 'newToday' | 'pendingSync' | 'crmNew' | 'default',
 *   showTodayBell: boolean,
 * }}
 */
export function getLeadRowHighlight(lead) {
	const statusNorm = String(lead?.crmStatus || "").trim().toLowerCase();
	/** Handled / won / closed-positive — strong green row */
	const isCompleteGreen =
		statusNorm === "sold" ||
		statusNorm === "done" ||
		statusNorm === "closed";
	const isLost = statusNorm === "lost";

	if (isCompleteGreen) {
		return { variant: "sold", showTodayBell: false };
	}
	if (isLost) {
		return { variant: "lost", showTodayBell: false };
	}

	const gmailInboxDone = Boolean(
		String(lead?.gmailMarkedDoneAt || "").trim(),
	);
	if (gmailInboxDone) {
		return { variant: "inboxDone", showTodayBell: false };
	}

	const today = isLeadFromToday(lead);
	const pendingGmail = lead?.kind === "gmail" && !lead?.savedInCrm;
	const crmNew =
		Boolean(lead?.savedInCrm) &&
		statusNorm === "new";

	if (today && pendingGmail) {
		return { variant: "newTodayPending", showTodayBell: true };
	}
	if (today) {
		return { variant: "newToday", showTodayBell: true };
	}
	if (pendingGmail) {
		return { variant: "pendingSync", showTodayBell: false };
	}
	if (crmNew) {
		return { variant: "crmNew", showTodayBell: false };
	}
	return { variant: "default", showTodayBell: false };
}

/** Tailwind classes for table rows / mobile cards (background + border). */
export function leadRowSurfaceClass(variant) {
	switch (variant) {
		case "inboxDone":
			return "border-b border-emerald-300/90 bg-gradient-to-r from-emerald-100/90 via-emerald-50/95 to-white shadow-[inset_4px_0_0_0_#059669] hover:from-emerald-100 hover:via-emerald-50";
		case "sold":
			return "border-b border-emerald-200/95 bg-emerald-50/75 hover:bg-emerald-50/95";
		case "lost":
			return "border-b border-emerald-100/90 bg-emerald-50/30 hover:bg-emerald-50/45";
		case "newTodayPending":
			return "border-b border-amber-200/90 bg-amber-50/80 hover:bg-amber-50";
		case "newToday":
			return "border-b border-sky-200/80 bg-sky-50/60 hover:bg-sky-50/90";
		case "pendingSync":
			return "border-b border-amber-100/90 bg-amber-50/40 hover:bg-amber-50/65";
		case "crmNew":
			return "border-b border-violet-100/90 bg-violet-50/35 hover:bg-violet-50/55";
		default:
			return "border-b border-slate-100 bg-white hover:bg-slate-50/90";
	}
}

/** Classes for mobile list cards (full border). */
export function leadCardSurfaceClass(variant) {
	switch (variant) {
		case "inboxDone":
			return "border-emerald-500/90 bg-gradient-to-br from-emerald-100/95 to-emerald-50/80 shadow-md shadow-emerald-700/15 ring-1 ring-emerald-400/50 hover:from-emerald-100";
		case "sold":
			return "border-emerald-300/90 bg-emerald-50/85 shadow-md shadow-emerald-900/[0.06] hover:bg-emerald-50";
		case "lost":
			return "border-emerald-200/80 bg-emerald-50/40 shadow-sm hover:bg-emerald-50/55";
		case "newTodayPending":
			return "border-amber-300/90 bg-amber-50/85 shadow-md shadow-amber-900/[0.06] hover:bg-amber-50";
		case "newToday":
			return "border-sky-300/80 bg-sky-50/70 shadow-md shadow-sky-900/[0.05] hover:bg-sky-50/90";
		case "pendingSync":
			return "border-amber-200/90 bg-amber-50/50 hover:bg-amber-50/70";
		case "crmNew":
			return "border-violet-200/90 bg-violet-50/45 hover:bg-violet-50/65";
		default:
			return "border-slate-200/90 bg-white shadow-sm hover:border-slate-300/90";
	}
}
