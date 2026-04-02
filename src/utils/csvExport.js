const COLS = [
	"date",
	"name",
	"phone",
	"email",
	"car",
	"source",
	"status",
	"notes",
	"handledBy",
	"followUpDate",
	"gmailMessageId",
	"leadOrigin",
	"subject",
];

function escapeCell(v) {
	const s = String(v ?? "");
	if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
	return s;
}

/** Build UTF-8 CSV with BOM for Excel. */
export function leadsToCsv(rows) {
	const header = COLS.join(",");
	const lines = [header];
	for (const r of rows) {
		lines.push(COLS.map((c) => escapeCell(r[c])).join(","));
	}
	return `\uFEFF${lines.join("\r\n")}`;
}

export function downloadTextFile(filename, text) {
	const blob = new Blob([text], { type: "text/csv;charset=utf-8" });
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	a.download = filename;
	a.click();
	URL.revokeObjectURL(url);
}
