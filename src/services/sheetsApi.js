import { SHEET_ID, SHEET_NAME, COLS } from "../constants.js";
import { messageFromSheetsResponse } from "../utils/sheetsErrors.js";

const BASE = "https://sheets.googleapis.com/v4/spreadsheets";

function encodeRange(r) {
	return encodeURIComponent(r);
}

export async function fetchLeadsRaw(accessToken) {
	const range = `${SHEET_NAME}!A1:H5000`;
	const url = `${BASE}/${SHEET_ID}/values/${encodeRange(range)}`;
	const res = await fetch(url, {
		headers: { Authorization: `Bearer ${accessToken}` },
	});
	if (res.status === 401) {
		const err = new Error("UNAUTHORIZED");
		err.code = "UNAUTHORIZED";
		throw err;
	}
	if (!res.ok) {
		const t = await res.text();
		throw new Error(
			messageFromSheetsResponse(res.status, t) ||
				`Sheets error ${res.status}`,
		);
	}
	const data = await res.json();
	return data.values || [];
}

export function parseLeads(rows) {
	if (!rows.length) return [];
	const first = (rows[0] || []).map((c) => String(c).trim().toLowerCase());
	const isHeader =
		first[0] === "date" ||
		(first[0]?.includes("date") && first[1]?.includes("name"));

	const startIdx = isHeader ? 1 : 0;
	const out = [];
	for (let i = startIdx; i < rows.length; i++) {
		const c = rows[i] || [];
		const sheetRow = i + 1;
		const name = String(c[COLS.name] ?? "").trim();
		const phone = String(c[COLS.phone] ?? "").trim();
		const email = String(c[COLS.email] ?? "").trim();
		if (!name && !phone && !email) continue;
		out.push({
			sheetRow,
			date: String(c[COLS.date] ?? "").trim(),
			name,
			phone,
			email,
			car: String(c[COLS.car] ?? "").trim(),
			source: String(c[COLS.source] ?? "").trim(),
			status: String(c[COLS.status] ?? "").trim() || "New",
			notes: String(c[COLS.notes] ?? "").trim(),
		});
	}
	return out;
}

export function leadToRow(lead) {
	return [
		lead.date,
		lead.name,
		lead.phone,
		lead.email,
		lead.car,
		lead.source,
		lead.status,
		lead.notes,
	];
}

export async function updateLeadRow(accessToken, sheetRow, lead) {
	const range = `${SHEET_NAME}!A${sheetRow}:H${sheetRow}`;
	const url = `${BASE}/${SHEET_ID}/values/${encodeRange(range)}?valueInputOption=USER_ENTERED`;
	const res = await fetch(url, {
		method: "PUT",
		headers: {
			Authorization: `Bearer ${accessToken}`,
			"Content-Type": "application/json",
		},
		body: JSON.stringify({ values: [leadToRow(lead)] }),
	});
	if (res.status === 401) {
		const err = new Error("UNAUTHORIZED");
		err.code = "UNAUTHORIZED";
		throw err;
	}
	if (!res.ok) {
		const t = await res.text();
		throw new Error(
			messageFromSheetsResponse(res.status, t) ||
				`Update failed ${res.status}`,
		);
	}
}

export async function appendLeadRow(accessToken, lead) {
	const range = `${SHEET_NAME}!A:H`;
	const url = `${BASE}/${SHEET_ID}/values/${encodeRange(range)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;
	const res = await fetch(url, {
		method: "POST",
		headers: {
			Authorization: `Bearer ${accessToken}`,
			"Content-Type": "application/json",
		},
		body: JSON.stringify({ values: [leadToRow(lead)] }),
	});
	if (res.status === 401) {
		const err = new Error("UNAUTHORIZED");
		err.code = "UNAUTHORIZED";
		throw err;
	}
	if (!res.ok) {
		const t = await res.text();
		throw new Error(
			messageFromSheetsResponse(res.status, t) ||
				`Append failed ${res.status}`,
		);
	}
}
