/** Parse sheet date cell for sorting (newest first). */
export function leadSortTimeMs(dateStr) {
	const s = String(dateStr || "").trim();
	if (!s) return 0;
	const iso = Date.parse(s);
	if (!Number.isNaN(iso)) return iso;
	const m = s.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})$/);
	if (m) {
		const day = +m[1];
		const month = +m[2] - 1;
		let year = +m[3];
		if (m[3].length === 2) year += year >= 70 ? 1900 : 2000;
		const d = new Date(year, month, day);
		const t = d.getTime();
		return Number.isNaN(t) ? 0 : t;
	}
	return 0;
}
