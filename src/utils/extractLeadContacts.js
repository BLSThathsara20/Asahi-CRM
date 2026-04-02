/**
 * Pull likely name, email, phone from pasted lead / enquiry text (no network).
 * @returns {{ name: string, email: string, phone: string }}
 */
export function extractContactsFromText(raw) {
	const text = String(raw || "");
	const out = { name: "", email: "", phone: "" };
	if (!text.trim()) return out;

	const emailMatch = text.match(
		/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i,
	);
	if (emailMatch) out.email = emailMatch[0].trim().toLowerCase();

	const nameMatch = text.match(
		/(?:^|[\n\r])[\t\s]*(?:name|from|contact(?:\s+name)?)\s*[-:—]\s*([^\n\r<|]+)/i,
	);
	if (nameMatch) {
		out.name = nameMatch[1]
			.replace(/\s+/g, " ")
			.trim()
			.replace(/[,;.]+$/, "")
			.slice(0, 80);
	}

	const phoneFromLabel = text.match(
		/(?:^|[\n\r])[\t\s]*(?:tel|mob(?:ile)?|phone|m)\s*[-.#:—]\s*([+()\d][\d\s().-]{8,22}\d)/im,
	);
	const candidates = [];
	if (phoneFromLabel) candidates.push(phoneFromLabel[1]);

	for (const re of [
		/(?:\+44\s?|0)7\d{2,3}\s?\d{3}\s?\d{3,4}/g,
		/\+44\s?\d{2,4}\s?\d{3,4}\s?\d{3,4}/g,
		/\b0\d{3}\s?\d{3}\s?\d{4}\b/g,
		/\+\d{10,15}\b/g,
	]) {
		let m;
		const r = new RegExp(re.source, re.flags);
		while ((m = r.exec(text)) !== null) {
			candidates.push(m[0]);
		}
	}

	const best = pickBestPhoneCandidate(candidates);
	if (best) out.phone = formatPhoneHint(best);

	return out;
}

function pickBestPhoneCandidate(parts) {
	let best = "";
	let bestScore = 0;
	const seen = new Set();
	for (const raw of parts) {
		const d = raw.replace(/\D/g, "");
		if (d.length < 10 || d.length > 15) continue;
		const key = d;
		if (seen.has(key)) continue;
		seen.add(key);
		let score = d.length;
		if (d.startsWith("44") && d.length >= 12) score += 4;
		if (d.startsWith("07") || (d.startsWith("7") && d.length === 10)) score += 3;
		if (score > bestScore) {
			bestScore = score;
			best = raw;
		}
	}
	return best ? best.trim() : "";
}

function formatPhoneHint(raw) {
	const d = raw.replace(/\D/g, "");
	if (d.startsWith("44") && d.length >= 12) {
		const rest = d.slice(2);
		if (rest.length === 10 && rest.startsWith("7")) {
			return `0${rest.slice(0, 4)} ${rest.slice(4, 7)} ${rest.slice(7)}`.trim();
		}
		return `+${d.slice(0, 2)} ${rest.slice(0, 4)} ${rest.slice(4, 7)} ${rest.slice(7)}`.trim();
	}
	if (d.length === 11 && d.startsWith("0")) {
		return `${d.slice(0, 5)} ${d.slice(5, 8)} ${d.slice(8)}`;
	}
	return raw.replace(/\s+/g, " ").trim();
}

/**
 * Prefer sheet data, then regex (email/phone — avoids bad AI), then AI for gaps;
 * name prefers AI over regex for unstructured prose.
 * @param {object} lead
 * @param {{ name?: string, email?: string, phone?: string }} regexHints
 * @param {{ customerName?: string, email?: string, phone?: string } | null} aiHints
 */
export function mergeEffectiveContacts(lead, regexHints, aiHints) {
	const lo = lead == null ? {} : lead;
	const l = (v) => String(v ?? "").trim();
	const ai = aiHints || {};
	const rx = regexHints || {};
	const nm = l(lo.name) || l(ai.customerName) || l(ai.name) || l(rx.name);
	const em = l(lo.email) || l(rx.email) || l(ai.email);
	const ph = l(lo.phone) || l(rx.phone) || l(ai.phone);
	return { name: nm, email: em, phone: ph };
}
