import { ChevronLeft, ChevronRight } from "lucide-react";

/**
 * @param {object} props
 * @param {number} props.page — 1-based
 * @param {number} props.pageCount
 * @param {number} props.totalItems
 * @param {number} props.pageSize
 * @param {(p: number) => void} props.onPageChange
 * @param {string} [props.itemLabel]
 */
export function PaginationControls({
	page,
	pageCount,
	totalItems,
	pageSize,
	onPageChange,
	itemLabel = "items",
}) {
	if (totalItems === 0) return null;

	const from = (page - 1) * pageSize + 1;
	const to = Math.min(page * pageSize, totalItems);

	return (
		<div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
			<p className="text-xs text-slate-500">
				Showing{" "}
				<span className="font-medium text-slate-700">
					{from}–{to}
				</span>{" "}
				of{" "}
				<span className="font-medium text-slate-700">{totalItems}</span>{" "}
				{itemLabel}
			</p>
			<div className="flex items-center gap-1">
				<button
					type="button"
					disabled={page <= 1}
					onClick={() => onPageChange(page - 1)}
					className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 shadow-sm disabled:opacity-40"
				>
					<ChevronLeft className="h-4 w-4" />
					Prev
				</button>
				<span className="px-2 text-xs text-slate-500">
					Page {page} / {pageCount}
				</span>
				<button
					type="button"
					disabled={page >= pageCount}
					onClick={() => onPageChange(page + 1)}
					className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 shadow-sm disabled:opacity-40"
				>
					Next
					<ChevronRight className="h-4 w-4" />
				</button>
			</div>
		</div>
	);
}
