const styles = {
	New: "bg-sky-100 text-sky-800 ring-sky-200/80",
	Contacted: "bg-amber-100 text-amber-900 ring-amber-200/80",
	"Follow-up": "bg-orange-100 text-orange-900 ring-orange-200/80",
	Done: "bg-emerald-100 text-emerald-900 ring-emerald-200/85",
	Sold: "bg-emerald-100 text-emerald-800 ring-emerald-200/80",
	Lost: "bg-rose-100 text-rose-800 ring-rose-200/80",
	Closed: "bg-emerald-50 text-emerald-900 ring-emerald-200/80",
	Saved: "bg-emerald-50 text-emerald-900 ring-emerald-200/90",
};

export function StatusBadge({ status }) {
	const key = status in styles ? status : "New";
	const cls = styles[key] || styles.New;
	return (
		<span
			className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset transition-colors ${cls}`}
		>
			{status || "New"}
		</span>
	);
}
