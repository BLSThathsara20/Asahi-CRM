/** Non-empty value means outreach was logged (usually ISO timestamp). */
export function hasOutreach(value) {
	return Boolean(String(value || "").trim());
}

export function isAutotraderLead(lead) {
	return String(lead?.source || "")
		.trim()
		.toLowerCase()
		.includes("autotrader");
}

/** Short label for table UI */
export function outreachLabel(value) {
	const s = String(value || "").trim();
	if (!s) return "";
	const d = Date.parse(s);
	if (!Number.isNaN(d)) {
		return new Date(d).toLocaleDateString(undefined, {
			month: "short",
			day: "numeric",
		});
	}
	if (/^yes|done|y$/i.test(s)) return "Done";
	return s.slice(0, 12);
}
