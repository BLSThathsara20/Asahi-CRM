/** @param {number} page 1-based */
export function slicePage(items, page, pageSize) {
	const p = Math.max(1, page);
	const start = (p - 1) * pageSize;
	return items.slice(start, start + pageSize);
}

export function totalPages(length, pageSize) {
	return Math.max(1, Math.ceil(Math.max(0, length) / pageSize));
}
