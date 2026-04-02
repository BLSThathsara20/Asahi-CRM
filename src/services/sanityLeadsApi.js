import { createClient } from "@sanity/client";

const apiVersion = "2024-01-01";

export function isSanityConfigured() {
	return Boolean(
		import.meta.env.VITE_SANITY_PROJECT_ID?.trim() &&
			import.meta.env.VITE_SANITY_DATASET?.trim() &&
			import.meta.env.VITE_SANITY_API_TOKEN?.trim(),
	);
}

function getClient() {
	if (!isSanityConfigured()) {
		const err = new Error("SANITY_NOT_CONFIGURED");
		throw err;
	}
	return createClient({
		projectId: import.meta.env.VITE_SANITY_PROJECT_ID.trim(),
		dataset: import.meta.env.VITE_SANITY_DATASET.trim(),
		apiVersion,
		useCdn: false,
		token: import.meta.env.VITE_SANITY_API_TOKEN.trim(),
	});
}

/** Stable Sanity document id from Gmail message id (allowed charset for _id). */
export function sanityDocIdForGmailMessageId(gmailMessageId) {
	const raw = String(gmailMessageId || "").trim();
	if (!raw) throw new Error("Missing gmailMessageId");
	const safe = raw.replace(/[^a-zA-Z0-9_-]/g, "_");
	return `lead.${safe}`;
}

/**
 * @returns {Promise<Set<string>>}
 */
export async function fetchSavedGmailMessageIds() {
	const client = getClient();
	const ids = await client.fetch(
		`*[_type == "lead" && defined(gmailMessageId) && gmailMessageId != ""].gmailMessageId`,
	);
	return new Set((ids || []).map((x) => String(x).trim()).filter(Boolean));
}

function sanityDocToSavedLead(doc) {
	if (!doc) return null;
	return {
		_sanityDocumentId: doc._id,
		sheetRow: null,
		date: String(doc.date ?? "").trim(),
		name: String(doc.name ?? "").trim(),
		phone: String(doc.phone ?? "").trim(),
		email: String(doc.email ?? "").trim(),
		car: String(doc.car ?? "").trim(),
		source: String(doc.source ?? "").trim(),
		status: String(doc.status ?? "").trim() || "New",
		notes: String(doc.notes ?? "").trim(),
		handledBy: String(doc.handledBy ?? "").trim(),
		followUpDate: String(doc.followUpDate ?? "").trim(),
		gmailMessageId: String(doc.gmailMessageId ?? "").trim(),
		leadOrigin: String(doc.leadOrigin ?? "").trim(),
		bodyText: String(doc.bodyText ?? "").trim(),
		subject: String(doc.subject ?? "").trim(),
		snippet: String(doc.snippet ?? "").trim(),
		gmailMarkedDoneAt: String(doc.gmailMarkedDoneAt ?? "").trim() || null,
	};
}

function leadDocDateFields(doc) {
	const d = doc?.date;
	let dateLabel = "—";
	let internalDate = "0";
	if (d) {
		const t = Date.parse(String(d));
		if (!Number.isNaN(t)) {
			internalDate = String(t);
			dateLabel = new Intl.DateTimeFormat("en-GB", {
				dateStyle: "medium",
				timeStyle: "short",
			}).format(t);
		} else {
			dateLabel = String(d);
			internalDate = String(Date.parse(d) || 0);
		}
	}
	return { dateLabel, internalDate };
}

/** Merge list row for a manual / physical Sanity document. */
export function sanityDocumentToBoardRow(doc) {
	if (!doc?._id) return null;
	const { dateLabel, internalDate } = leadDocDateFields(doc);
	const gid = String(doc.gmailMessageId ?? "").trim();
	if (gid) return null;

	return {
		kind: "physical",
		id: doc._id,
		sanityDocumentId: doc._id,
		threadId: null,
		source: doc.source || "Physical",
		fromName: doc.name || "",
		fromEmail: doc.email || "",
		subject: doc.subject || "Walk-in / manual lead",
		snippet:
			doc.snippet ||
			(doc.notes ? String(doc.notes).slice(0, 160) : "") ||
			"",
		dateLabel,
		internalDate,
		savedInCrm: true,
		crmStatus: doc.status || "New",
	};
}

/**
 * Board row from Sanity only (no live Gmail). Used for non–company accounts:
 * includes Gmail-originated leads already stored in the CRM.
 */
export function sanityDocumentToCrmOnlyBoardRow(doc) {
	if (!doc?._id) return null;
	const { dateLabel, internalDate } = leadDocDateFields(doc);
	const gid = String(doc.gmailMessageId ?? "").trim();
	if (gid) {
		return {
			kind: "gmail",
			id: gid,
			sanityDocumentId: doc._id,
			loadFromSanityOnly: true,
			threadId: null,
			source: doc.source || doc.leadOrigin || "Gmail",
			fromName: doc.name || "",
			fromEmail: doc.email || "",
			subject: doc.subject || "—",
			snippet:
				doc.snippet ||
				(doc.notes ? String(doc.notes).slice(0, 160) : "") ||
				"",
			dateLabel,
			internalDate,
			savedInCrm: true,
			crmStatus: doc.status || "New",
			gmailMarkedDoneAt: doc.gmailMarkedDoneAt || null,
		};
	}
	return sanityDocumentToBoardRow(doc);
}

/** All lead documents for dashboard merge (light projection). */
export async function fetchAllLeadDocuments() {
	const client = getClient();
	return client.fetch(
		`*[_type == "lead"] | order(_updatedAt desc) {
      _id,
      _updatedAt,
      gmailMessageId,
      leadOrigin,
      date, name, phone, email, car, source, status, notes, handledBy, followUpDate,
      subject, snippet, bodyText
    }`,
	);
}

/** @param {string} messageId */
export async function getLeadFromSanityByMessageId(messageId) {
	const client = getClient();
	const mid = String(messageId || "").trim();
	const doc = await client.fetch(
		`*[_type == "lead" && gmailMessageId == $mid][0]`,
		{ mid },
	);
	return sanityDocToSavedLead(doc);
}

/** @param {string} documentId Sanity _id */
export async function getLeadFromSanityById(documentId) {
	const client = getClient();
	const id = String(documentId || "").trim();
	if (!id) return null;
	const doc = await client.fetch(`*[_type == "lead" && _id == $id][0]`, {
		id,
	});
	return sanityDocToSavedLead(doc);
}

/**
 * Create or replace lead. Gmail rows: keyed by gmailMessageId. Physical: pass _sanityId or get new lead.physical.* id.
 * @param {object} lead
 * @returns {Promise<string>} document _id
 */
export async function upsertLeadToSanity(lead) {
	const client = getClient();
	const gmailMessageId = String(lead.gmailMessageId || "").trim();
	let _id = String(lead._sanityId || "").trim();

	if (gmailMessageId) {
		_id = sanityDocIdForGmailMessageId(gmailMessageId);
	} else if (!_id) {
		_id = `lead.physical.${crypto.randomUUID()}`;
	}

	const doc = {
		_id,
		_type: "lead",
		leadOrigin: gmailMessageId ? "gmail" : "physical",
		date: lead.date ?? "",
		name: lead.name ?? "",
		phone: lead.phone ?? "",
		email: lead.email ?? "",
		car: lead.car ?? "",
		source: lead.source ?? "",
		status: lead.status ?? "New",
		notes: lead.notes ?? "",
		handledBy: lead.handledBy ?? "",
		followUpDate: lead.followUpDate ?? "",
		subject: lead.subject ?? "",
		snippet: lead.snippet ?? "",
		bodyText: lead.bodyText ?? "",
	};

	if (gmailMessageId) {
		doc.gmailMessageId = gmailMessageId;
	}

	const hasDoneKey = Object.prototype.hasOwnProperty.call(
		lead,
		"gmailMarkedDoneAt",
	);
	const prevDone = gmailMessageId
		? await client
				.fetch(`*[_id == $id][0].gmailMarkedDoneAt`, { id: _id })
				.catch(() => null)
		: null;
	let doneVal;
	if (hasDoneKey) {
		doneVal =
			lead.gmailMarkedDoneAt == null || lead.gmailMarkedDoneAt === ""
				? undefined
				: lead.gmailMarkedDoneAt;
	} else {
		doneVal = prevDone || undefined;
	}
	if (doneVal) {
		doc.gmailMarkedDoneAt = doneVal;
	}

	await client.createOrReplace(doc);
	return _id;
}

/**
 * Set or clear Gmail "mark done" timestamp (creates minimal lead if needed).
 * @param {string} gmailMessageId
 * @param {string | null} markedDoneAtIso - ISO string, or null to clear
 */
export async function patchLeadGmailMarkedDone(gmailMessageId, markedDoneAtIso) {
	const client = getClient();
	const mid = String(gmailMessageId || "").trim();
	if (!mid) throw new Error("Missing gmailMessageId");
	const _id = sanityDocIdForGmailMessageId(mid);
	const existingId = await client.fetch(`*[_id == $id][0]._id`, { id: _id });

	if (existingId) {
		if (markedDoneAtIso) {
			await client
				.patch(_id)
				.set({ gmailMarkedDoneAt: markedDoneAtIso })
				.commit();
		} else {
			await client.patch(_id).unset(["gmailMarkedDoneAt"]).commit();
		}
		return;
	}

	if (markedDoneAtIso) {
		await client.create({
			_id,
			_type: "lead",
			leadOrigin: "gmail",
			gmailMessageId: mid,
			status: "New",
			gmailMarkedDoneAt: markedDoneAtIso,
		});
	}
}
