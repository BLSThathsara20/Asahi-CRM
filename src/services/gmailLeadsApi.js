import { GMAIL_DONE_LABEL_NAME } from "../constants.js";
import {
	formatGmailInternalDate,
	parseFromHeader,
} from "../utils/gmailParse.js";
import { promiseWithTimeout } from "../utils/promiseTimeout.js";

const GMAIL_METADATA_TIMEOUT_MS = 14_000;
const GMAIL_LIST_LABELS_TIMEOUT_MS = 25_000;
const GMAIL_LIST_IDS_TIMEOUT_MS = 25_000;

const BASE = "https://gmail.googleapis.com/gmail/v1/users/me";

async function gmailJson(path, token, init = {}) {
	const res = await fetch(`${BASE}${path}`, {
		...init,
		headers: {
			Authorization: `Bearer ${token}`,
			...(init.headers || {}),
		},
	});
	if (res.status === 401) {
		const e = new Error("UNAUTHORIZED");
		e.code = "UNAUTHORIZED";
		throw e;
	}
	if (!res.ok) {
		let msg = `Gmail ${res.status}`;
		try {
			const j = await res.json();
			if (j?.error?.message) msg = j.error.message;
		} catch {
			/* ignore */
		}
		const e = new Error(msg);
		e.status = res.status;
		throw e;
	}
	return res.json();
}

export async function listUserLabels(accessToken) {
	const data = await promiseWithTimeout(
		gmailJson("/labels", accessToken),
		GMAIL_LIST_LABELS_TIMEOUT_MS,
		"Gmail labels request timed out",
	);
	return data.labels || [];
}

/** Case-insensitive match on user label name */
export function findLabelIdByName(labels, name) {
	const want = String(name || "").trim().toLowerCase();
	if (!want) return null;
	const hit = (labels || []).find(
		(l) =>
			String(l?.name || "")
				.trim()
				.toLowerCase() === want &&
			l.type === "user",
	);
	return hit?.id || null;
}

export async function listMessageIdsInLabel(accessToken, labelId, maxResults) {
	const out = [];
	let pageToken;

	for (;;) {
		const remain = maxResults - out.length;
		if (remain <= 0) break;
		const u = new URLSearchParams({
			labelIds: labelId,
			maxResults: String(Math.min(50, remain)),
		});
		if (pageToken) u.set("pageToken", pageToken);
		const data = await promiseWithTimeout(
			gmailJson(`/messages?${u}`, accessToken),
			GMAIL_LIST_IDS_TIMEOUT_MS,
			"Gmail messages list timed out",
		);
		const msgs = data.messages || [];
		for (const m of msgs) {
			if (m?.id) out.push({ id: m.id, threadId: m.threadId });
		}
		pageToken = data.nextPageToken;
		if (!pageToken || out.length >= maxResults) break;
	}

	return out;
}

function getHeader(headers, name) {
	if (!headers) return "";
	const want = name.toLowerCase();
	const h = headers.find((x) => String(x?.name || "").toLowerCase() === want);
	return String(h?.value || "").trim();
}

function decodeBase64Url(data) {
	const s = String(data || "").replace(/-/g, "+").replace(/_/g, "/");
	const pad = s.length % 4;
	const b64 = pad ? s + "=".repeat(4 - pad) : s;
	try {
		const bin = atob(b64);
		const bytes = new Uint8Array(bin.length);
		for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
		return new TextDecoder("utf-8").decode(bytes);
	} catch {
		return "";
	}
}

function collectPlainFromParts(parts, out) {
	if (!parts) return;
	for (const p of parts) {
		if (p.mimeType === "multipart/alternative" || p.mimeType?.startsWith("multipart/")) {
			collectPlainFromParts(p.parts, out);
			continue;
		}
		if (p.mimeType === "text/plain" && p.body?.data) {
			out.push(decodeBase64Url(p.body.data));
		}
	}
}

function collectHtmlFromParts(parts, out) {
	if (!parts) return;
	for (const p of parts) {
		if (p.mimeType === "multipart/alternative" || p.mimeType?.startsWith("multipart/")) {
			collectHtmlFromParts(p.parts, out);
			continue;
		}
		if (p.mimeType === "text/html" && p.body?.data) {
			out.push(decodeBase64Url(p.body.data));
		}
	}
}

export function extractPlainTextBody(message) {
	const payload = message?.payload;
	if (!payload) return "";
	const out = [];
	if (payload.body?.data && payload.mimeType === "text/plain") {
		return decodeBase64Url(payload.body.data);
	}
	collectPlainFromParts(payload.parts, out);
	return out.join("\n\n").trim();
}

/** Concatenated HTML parts (for link extraction; not sanitized for display). */
export function extractHtmlBody(message) {
	const payload = message?.payload;
	if (!payload) return "";
	const out = [];
	if (payload.body?.data && payload.mimeType === "text/html") {
		return decodeBase64Url(payload.body.data);
	}
	collectHtmlFromParts(payload.parts, out);
	return out.join("\n\n").trim();
}

export async function getGmailMessage(accessToken, messageId, format = "full") {
	const q = new URLSearchParams({ format });
	return gmailJson(`/messages/${encodeURIComponent(messageId)}?${q}`, accessToken);
}

/**
 * Metadata + headers for list cards (one request per message).
 */
export async function getGmailMessageSummary(accessToken, messageId) {
	const q = new URLSearchParams();
	q.set("format", "metadata");
	q.append("metadataHeaders", "From");
	q.append("metadataHeaders", "Subject");
	q.append("metadataHeaders", "Date");
	const msg = await gmailJson(
		`/messages/${encodeURIComponent(messageId)}?${q}`,
		accessToken,
	);
	const headers = msg.payload?.headers || [];
	const from = getHeader(headers, "From");
	const { name, email } = parseFromHeader(from);
	return {
		id: msg.id,
		threadId: msg.threadId,
		internalDate: msg.internalDate,
		snippet: String(msg.snippet || ""),
		subject: getHeader(headers, "Subject") || "(no subject)",
		fromName: name,
		fromEmail: email,
		dateLabel: formatGmailInternalDate(msg.internalDate),
	};
}

export async function ensureUserLabel(accessToken, labelName) {
	const labels = await listUserLabels(accessToken);
	let id = findLabelIdByName(labels, labelName);
	if (id) return id;

	const created = await gmailJson("/labels", accessToken, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			name: labelName,
			labelListVisibility: "labelShow",
			messageListVisibility: "show",
		}),
	});
	return created.id;
}

export async function addLabelsToMessage(accessToken, messageId, labelIds) {
	const ids = (labelIds || []).filter(Boolean);
	if (!ids.length) return;
	await gmailJson(`/messages/${encodeURIComponent(messageId)}/modify`, accessToken, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ addLabelIds: ids }),
	});
}

export async function markMessageDone(accessToken, messageId) {
	const doneId = await ensureUserLabel(accessToken, GMAIL_DONE_LABEL_NAME);
	await addLabelsToMessage(accessToken, messageId, [doneId]);
}

export async function unmarkMessageDone(accessToken, messageId) {
	const doneId = await ensureUserLabel(accessToken, GMAIL_DONE_LABEL_NAME);
	await gmailJson(`/messages/${encodeURIComponent(messageId)}/modify`, accessToken, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ removeLabelIds: [doneId] }),
	});
}

async function mapPool(items, limit, fn) {
	const results = [];
	for (let i = 0; i < items.length; i += limit) {
		const chunk = items.slice(i, i + limit);
		const part = await Promise.all(chunk.map((item, j) => fn(item, i + j)));
		results.push(...part);
	}
	return results;
}

/**
 * @returns {Promise<Array<{ id: string, threadId: string, source: string, fromName: string, fromEmail: string, subject: string, dateLabel: string, snippet: string, internalDate: string }>>}
 */
export async function fetchGmailLeadsForLabels(
	accessToken,
	labelDefs,
	{ maxPerLabel = 40, concurrentMetadata = 12 } = {},
) {
	const labels = await listUserLabels(accessToken);
	const byId = new Map();

	for (const def of labelDefs) {
		const labelId = findLabelIdByName(labels, def.gmailName);
		if (!labelId) {
			console.warn(
				`[Gmail] Missing user label "${def.gmailName}" — create it in Gmail settings.`,
			);
			continue;
		}
		const ids = await listMessageIdsInLabel(
			accessToken,
			labelId,
			maxPerLabel,
		);
		for (const row of ids) {
			const existing = byId.get(row.id);
			if (existing) {
				if (def.source === "Autotrader") existing.source = "Autotrader";
				continue;
			}
			byId.set(row.id, {
				id: row.id,
				threadId: row.threadId,
				source: def.source,
				kind: "gmail",
			});
		}
	}

	const stubs = [...byId.values()];
	const summaries = await mapPool(stubs, concurrentMetadata, async (stub) => {
		try {
			const s = await promiseWithTimeout(
				getGmailMessageSummary(accessToken, stub.id),
				GMAIL_METADATA_TIMEOUT_MS,
				`Gmail metadata timed out (${stub.id})`,
			);
			return {
				...s,
				source: stub.source,
				kind: "gmail",
			};
		} catch (e) {
			console.warn("[Gmail] message summary failed:", stub.id, e);
			return {
				id: stub.id,
				threadId: stub.threadId,
				internalDate: "0",
				snippet: "",
				subject: "(could not load subject)",
				fromName: "",
				fromEmail: "",
				dateLabel: "—",
				source: stub.source,
				kind: "gmail",
			};
		}
	});

	summaries.sort((a, b) => {
		const nb = Number(b.internalDate) || 0;
		const na = Number(a.internalDate) || 0;
		return nb - na;
	});

	return summaries;
}
