/**
 * Parse Auto Trader dealer notification emails (Gmail plain + HTML).
 * Plain text is usually tab-separated blocks under "Customer details", "Interested in", "Part exchange".
 * Deep links often only appear in HTML hrefs.
 */

const AT_HOST = /autotrader\.co\.uk/i;

function uniqueStrings(arr) {
	const seen = new Set();
	const out = [];
	for (const s of arr) {
		const t = String(s || "").trim();
		if (!t || seen.has(t)) continue;
		seen.add(t);
		out.push(t);
	}
	return out;
}

function normalizeLine(s) {
	return String(s || "")
		.replace(/\u00a0/g, " ")
		.replace(/[\t ]+$/, "")
		.trim();
}

/** @param {string} line */
function splitKeyValue(line) {
	if (line.includes("\t")) {
		const i = line.indexOf("\t");
		return [line.slice(0, i).trim(), line.slice(i + 1).trim()];
	}
	const m = line.match(/^(.+?)\s{2,}(.+)$/);
	if (m) return [m[1].trim(), m[2].trim()];
	return null;
}

/**
 * @param {string} plain
 * @returns {{ customer: Record<string, string>, interested: Record<string, string>, partEx: Record<string, string> }}
 */
function parseTabSections(plain) {
	const lines = String(plain || "").split(/\r?\n/).map(normalizeLine);
	let section = "";
	const out = {
		customer: /** @type {Record<string, string>} */ ({}),
		interested: /** @type {Record<string, string>} */ ({}),
		partEx: /** @type {Record<string, string>} */ ({}),
	};
	const headers = {
		"customer details": "customer",
		"interested in": "interested",
		"part exchange": "partEx",
	};

	for (const line of lines) {
		if (!line) continue;
		const low = line.toLowerCase();
		if (headers[low]) {
			section = headers[low];
			continue;
		}

		if (!section) continue;
		const kv = splitKeyValue(line);
		if (!kv) continue;
		const [k, v] = kv;
		if (!k || !v) continue;
		if (k.length < 2) continue;
		out[section][k] = v;
	}
	return out;
}

function findUrlsInText(text) {
	const out = [];
	const re = /\bhttps?:\/\/[^\s<>"')\]]+/gi;
	let m;
	const s = String(text || "");
	while ((m = re.exec(s)) !== null) {
		let u = m[0].replace(/[),.;]+$/, "");
		out.push(u);
	}
	return out;
}

function findHrefsInHtml(html) {
	const out = [];
	const re = /href\s*=\s*["']([^"']+)["']/gi;
	let m;
	const s = String(html || "");
	while ((m = re.exec(s)) !== null) {
		let u = m[1].replace(/&amp;/g, "&").trim();
		if (!u || u.startsWith("mailto:") || u.startsWith("#") || u.startsWith("javascript:"))
			continue;
		out.push(u);
	}
	return out;
}

function pickLeadPortalUrl(urls) {
	const list = urls.filter((u) => AT_HOST.test(u));
	for (const u of list) {
		if (/portal\.autotrader/i.test(u)) return u;
	}
	for (const u of list) {
		if (/lead|enquir|inbox|message|deal|notification/i.test(u)) return u;
	}
	return list[0] || "";
}

function pickAdvertUrl(urls) {
	for (const u of urls) {
		if (!AT_HOST.test(u)) continue;
		if (/\/advert\//i.test(u) || /\/cars\//i.test(u) || /stock/i.test(u)) return u;
	}
	return "";
}

/**
 * @param {{ plain?: string, html?: string, subject?: string, fromEmail?: string }} input
 * @returns {{
 *   isAutotraderNotification: boolean,
 *   customerName: string,
 *   interestedDescription: string,
 *   vrm: string,
 *   colourPreference: string,
 *   mileage: string,
 *   price: string,
 *   doors: string,
 *   upholstery: string,
 *   partExchangeDescription: string,
 *   partExchangeVrm: string,
 *   partExchangeMileage: string,
 *   partExchangeValuation: string,
 *   viewLeadUrl: string,
 *   advertUrl: string,
 *   phoneHint: string,
 * }}
 */
export function extractAutotraderLeadDetails(input) {
	const plain = String(input?.plain || "");
	const html = String(input?.html || "");
	const subject = String(input?.subject || "");
	const fromEmail = String(input?.fromEmail || "").toLowerCase();

	const empty = {
		isAutotraderNotification: false,
		customerName: "",
		interestedDescription: "",
		vrm: "",
		colourPreference: "",
		mileage: "",
		price: "",
		doors: "",
		upholstery: "",
		partExchangeDescription: "",
		partExchangeVrm: "",
		partExchangeMileage: "",
		partExchangeValuation: "",
		viewLeadUrl: "",
		advertUrl: "",
		phoneHint: "",
	};

	const looksLike =
		fromEmail.includes("leads@autotrader") ||
		fromEmail.includes("@em.autotrader.co.uk") ||
		fromEmail.includes("@autotrader.co.uk") ||
		/new lead via auto trader/i.test(plain) ||
		/new lead via auto trader/i.test(subject) ||
		(/customer details/i.test(plain) && /interested in/i.test(plain));

	if (!looksLike) return { ...empty };

	const sections = parseTabSections(plain);
	const c = sections.customer;
	const int = sections.interested;
	const px = sections.partEx;

	const first =
		c["First name"] || c["First Name"] || c["Firstname"] || "";
	const last = c["Surname"] || c["Last name"] || c["Last Name"] || "";
	const customerName = [first, last].filter(Boolean).join(" ").trim() || first;

	const urls = uniqueStrings([
		...findUrlsInText(plain),
		...findHrefsInHtml(html),
	]);

	const phoneHint =
		c["Phone"] ||
		c["Mobile"] ||
		c["Telephone"] ||
		c["Contact number"] ||
		"";

	return {
		isAutotraderNotification: true,
		customerName,
		phoneHint,
		interestedDescription: int["Description"] || "",
		vrm: int["VRM"] || "",
		colourPreference: int["Colour preference"] || int["Color preference"] || "",
		mileage: int["Mileage"] || "",
		price: int["Price"] || "",
		doors: int["Number of doors"] || "",
		upholstery: int["Upholstery preference"] || "",
		partExchangeDescription: px["Description"] || "",
		partExchangeVrm: px["VRM"] || "",
		partExchangeMileage: px["Mileage"] || "",
		partExchangeValuation:
			px["Part-ex valuation"] ||
			px["Part exchange valuation"] ||
			px["Valuation"] ||
			"",
		viewLeadUrl: pickLeadPortalUrl(urls),
		advertUrl: pickAdvertUrl(urls),
	};
}
