import {
	DEALERSHIP_ADDRESS_LINE,
	DEALERSHIP_HOURS_LINE,
	DEALERSHIP_PHONE,
	DEALERSHIP_SIGN_OFF,
	DEALERSHIP_WEB,
} from "../constants.js";

/**
 * Names only (no "models/" prefix). Unversioned gemini-1.5-flash is often retired
 * on v1beta — keep ListModels-compatible IDs. Order: preferred fast model first.
 */
const MODELS = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-flash-latest"];

export function getGeminiApiKey() {
	return String(import.meta.env.VITE_GEMINI_API_KEY || "").trim();
}

/**
 * @typedef {{ emailSubject: string, emailBody: string, autotraderBody: string, whatsappBody: string }} ChannelReplies
 */

function buildChannelPrompt(lead, staffFirstName) {
	const name = String(lead.name || "").trim() || "Customer";
	const firstName = name.split(/\s+/)[0] || name;
	const car = String(lead.car || "").trim() || "the vehicle";
	const source = String(lead.source || "").trim() || "Unknown";
	const notes = String(lead.notes || "").trim() || "None";
	const customerLeadMessage = String(lead.customerLeadMessage || "").trim();
	const staff = String(staffFirstName || "").trim();

	const staffLine = staff
		? `Hello ${firstName}, this is ${staff} from Asahi Motors.`
		: `Hello ${firstName}, thank you for contacting Asahi Motors.`;

	return `You help Asahi Motors (UK car dealer) write replies. Reply ONLY with valid JSON (no markdown fences, no extra text) with exactly these string keys:
emailSubject, emailBody, autotraderBody, whatsappBody

Use British English. Customer first name: "${firstName}". Vehicle / listing line (use naturally): "${car}".
Reflect this enquiry in the wording: "${customerLeadMessage}"
Lead source: ${source}. Staff notes (context only, do not quote): ${notes}

STRUCTURE — match these layouts closely:

--- emailSubject ---
Pattern: Asahi Motors – {short car description} Enquiry
Example: Asahi Motors – Fiat 500 Enquiry

--- emailBody ---
Hello ${firstName},

Thank you for your enquiry. The ${car} is still available!

When would you like to come and view the car?

${DEALERSHIP_ADDRESS_LINE}

${DEALERSHIP_HOURS_LINE}

${DEALERSHIP_SIGN_OFF}

--- autotraderBody ---
Hello ${firstName},

Thank you for your enquiry about the ${car} on Autotrader. The car is still available!

When would you like to come and view the car?

${DEALERSHIP_ADDRESS_LINE}

${DEALERSHIP_HOURS_LINE}

${DEALERSHIP_SIGN_OFF}
${DEALERSHIP_PHONE}
${DEALERSHIP_WEB}

--- whatsappBody ---
${staffLine}

Thank you for your enquiry about our ${car} on Autotrader. The car is still available!

When would you like to come and view the car?

${DEALERSHIP_HOURS_LINE}

Keep WhatsApp shorter than email: no full address block unless essential. Plain text only, single line breaks.

JSON keys again: emailSubject, emailBody, autotraderBody, whatsappBody`;
}

function isModelOrMethodNotAvailable(status, message) {
	const m = String(message || "").toLowerCase();
	if (status === 404) return true;
	if (status === 400 && m.includes("not found for api version")) return true;
	if (status === 400 && m.includes("not supported for generatecontent")) return true;
	if (m.includes("call listmodels")) return true;
	return false;
}

function parseChannelJson(text) {
	const raw = String(text || "").trim();
	try {
		return JSON.parse(raw);
	} catch {
		const start = raw.indexOf("{");
		const end = raw.lastIndexOf("}");
		if (start >= 0 && end > start) {
			return JSON.parse(raw.slice(start, end + 1));
		}
	}
	throw new Error("Could not parse AI response as JSON. Try again.");
}

/**
 * @param {object} lead — name, car, source, notes, customerLeadMessage
 * @param {{ staffFirstName?: string }} opts — WhatsApp opener; optional VITE_STAFF_FIRST_NAME or Google display name
 * @returns {Promise<ChannelReplies>}
 */
export async function generateChannelReplies(lead, opts = {}) {
	const apiKey = getGeminiApiKey();
	if (!apiKey) {
		throw new Error(
			"Gemini is not configured. Add VITE_GEMINI_API_KEY to .env (and GitHub secret for production).",
		);
	}

	const prompt = buildChannelPrompt(lead, opts.staffFirstName || "");
	const lastErrHolder = { err: null };

	for (const model of MODELS) {
		const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;

		const body = {
			contents: [{ parts: [{ text: prompt }] }],
			generationConfig: {
				temperature: 0.45,
				maxOutputTokens: 3072,
				responseMimeType: "application/json",
				responseSchema: {
					type: "object",
					properties: {
						emailSubject: { type: "string" },
						emailBody: { type: "string" },
						autotraderBody: { type: "string" },
						whatsappBody: { type: "string" },
					},
					required: [
						"emailSubject",
						"emailBody",
						"autotraderBody",
						"whatsappBody",
					],
				},
			},
		};

		let res = await fetch(url, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(body),
		});

		if (!res.ok && res.status === 400) {
			delete body.generationConfig.responseSchema;
			body.generationConfig.responseMimeType = "application/json";
			res = await fetch(url, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(body),
			});
		}

		if (!res.ok) {
			let msg = `Gemini error ${res.status}`;
			try {
				const j = await res.json();
				if (j?.error?.message) msg = j.error.message;
			} catch {
				/* ignore */
			}
			lastErrHolder.err = new Error(msg);
			const canTryNext = MODELS.indexOf(model) < MODELS.length - 1;
			if (canTryNext && isModelOrMethodNotAvailable(res.status, msg)) {
				continue;
			}
			throw lastErrHolder.err;
		}

		const data = await res.json();
		const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
		try {
			const parsed = parseChannelJson(text);
			const out = {
				emailSubject: String(parsed.emailSubject || "").trim(),
				emailBody: String(parsed.emailBody || "").trim(),
				autotraderBody: String(parsed.autotraderBody || "").trim(),
				whatsappBody: String(parsed.whatsappBody || "").trim(),
			};
			if (
				!out.emailSubject ||
				!out.emailBody ||
				!out.autotraderBody ||
				!out.whatsappBody
			) {
				throw new Error("Incomplete JSON from Gemini.");
			}
			return out;
		} catch (e) {
			lastErrHolder.err =
				e instanceof Error ? e : new Error("Parse error");
			if (MODELS.indexOf(model) < MODELS.length - 1) continue;
			throw lastErrHolder.err;
		}
	}

	throw lastErrHolder.err || new Error("Gemini request failed.");
}

const CONTACT_SCHEMA = {
	type: "object",
	properties: {
		customerName: { type: "string" },
		email: { type: "string" },
		phone: { type: "string" },
	},
	required: ["customerName", "email", "phone"],
};

/**
 * Optional JSON extraction for name / email / phone from pasted enquiry text.
 * @returns {Promise<{ customerName: string, email: string, phone: string }>}
 */
export async function extractContactsWithGemini(enquiryText) {
	const apiKey = getGeminiApiKey();
	if (!apiKey) {
		return { customerName: "", email: "", phone: "" };
	}
	const textIn = String(enquiryText || "").trim().slice(0, 8000);
	if (!textIn) {
		return { customerName: "", email: "", phone: "" };
	}

	const prompt = `You extract contact details from a UK car-dealer customer enquiry (email, Autotrader, web form paste, etc.).
Return ONLY valid JSON with keys customerName, email, phone. Use empty string "" for anything not clearly present or uncertain.
Do not invent data. Normalise email lower-case. Phone: keep a sensible UK/international format if possible.

Enquiry:
---
${textIn}
---

JSON keys: customerName, email, phone`;

	const lastErrHolder = { err: null };

	for (const model of MODELS) {
		const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;

		const body = {
			contents: [{ parts: [{ text: prompt }] }],
			generationConfig: {
				temperature: 0.1,
				maxOutputTokens: 512,
				responseMimeType: "application/json",
				responseSchema: CONTACT_SCHEMA,
			},
		};

		let res = await fetch(url, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(body),
		});

		if (!res.ok && res.status === 400) {
			delete body.generationConfig.responseSchema;
			body.generationConfig.responseMimeType = "application/json";
			res = await fetch(url, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(body),
			});
		}

		if (!res.ok) {
			let msg = `Gemini error ${res.status}`;
			try {
				const j = await res.json();
				if (j?.error?.message) msg = j.error.message;
			} catch {
				/* ignore */
			}
			lastErrHolder.err = new Error(msg);
			const canTryNext = MODELS.indexOf(model) < MODELS.length - 1;
			if (canTryNext && isModelOrMethodNotAvailable(res.status, msg)) {
				continue;
			}
			throw lastErrHolder.err;
		}

		const data = await res.json();
		const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
		try {
			const parsed = parseChannelJson(text);
			return {
				customerName: String(parsed.customerName || "").trim(),
				email: String(parsed.email || "").trim().toLowerCase(),
				phone: String(parsed.phone || "").trim(),
			};
		} catch (e) {
			lastErrHolder.err =
				e instanceof Error ? e : new Error("Parse error");
			if (MODELS.indexOf(model) < MODELS.length - 1) continue;
			throw lastErrHolder.err;
		}
	}

	throw lastErrHolder.err || new Error("Gemini contact extraction failed.");
}

