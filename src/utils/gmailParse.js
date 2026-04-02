/** Parse Gmail "From" header: `"Name" <email>` or `email` */
export function parseFromHeader(from) {
	const s = String(from || "").trim();
	if (!s) return { name: "", email: "" };

	const bracket = s.match(/^(.+?)\s*<([^>]+)>$/);
	if (bracket) {
		let name = bracket[1].trim().replace(/^"|"$/g, "").trim();
		const email = bracket[2].trim();
		if (!name || name === email) name = email.split("@")[0] || email;
		return { name, email };
	}

	if (s.includes("@") && !s.includes(" ")) {
		return { name: s.split("@")[0] || s, email: s };
	}

	return { name: s, email: "" };
}

export function formatGmailInternalDate(ms) {
	const n = Number(ms);
	if (!Number.isFinite(n)) return "";
	const d = new Date(n);
	return d.toLocaleString(undefined, {
		dateStyle: "medium",
		timeStyle: "short",
	});
}

export function internalDateToSheetDate(ms) {
	const n = Number(ms);
	if (!Number.isFinite(n)) return "";
	const d = new Date(n);
	const y = d.getFullYear();
	const m = String(d.getMonth() + 1).padStart(2, "0");
	const day = String(d.getDate()).padStart(2, "0");
	return `${y}-${m}-${day}`;
}
