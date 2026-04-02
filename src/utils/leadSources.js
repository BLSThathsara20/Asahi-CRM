/** Tailwind classes for source pills (badges). */
export function sourcePillClass(source) {
	const s = String(source || "")
		.trim()
		.toLowerCase();
	if (s === "autotrader") return "bg-violet-100 text-violet-900 ring-violet-200/70";
	if (s === "website") return "bg-sky-100 text-sky-900 ring-sky-200/70";
	if (s === "car dealer") return "bg-teal-100 text-teal-900 ring-teal-200/70";
	if (s === "physical") return "bg-amber-100 text-amber-950 ring-amber-200/70";
	return "bg-slate-100 text-slate-800 ring-slate-200/80";
}
