import { createClient } from "@sanity/client";
import { isSanityConfigured } from "./sanityLeadsApi.js";

const apiVersion = "2024-01-01";

function client() {
	if (!isSanityConfigured()) throw new Error("SANITY_NOT_CONFIGURED");
	return createClient({
		projectId: import.meta.env.VITE_SANITY_PROJECT_ID.trim(),
		dataset: import.meta.env.VITE_SANITY_DATASET.trim(),
		apiVersion,
		useCdn: false,
		token: import.meta.env.VITE_SANITY_API_TOKEN.trim(),
	});
}

export function crmUserDocumentId(email) {
	const safe = String(email || "")
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9-]/g, "_")
		.replace(/_+/g, "_");
	return `crmUser.${safe || "unknown"}`;
}

/** @param {string} email lowercased */
export async function getCrmUserByEmail(email) {
	if (!isSanityConfigured()) return null;
	const e = String(email || "").trim().toLowerCase();
	if (!e) return null;
	const c = client();
	return c.fetch(`*[_type == "crmUser" && lower(email) == $e][0]`, {
		e,
	});
}

export async function listCrmUsers() {
	if (!isSanityConfigured()) return [];
	const c = client();
	return c.fetch(
		`*[_type == "crmUser"] | order(email asc) {
      _id,
      email,
      displayName,
      role,
      permissionOverrides,
      lastLoginAt,
      passwordSetupExpiresAt,
      passwordSetupUsedAt,
      _updatedAt
    }`,
	);
}

function generatePasswordSetupSecret() {
	const a = new Uint8Array(32);
	crypto.getRandomValues(a);
	return Array.from(a, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Public URL for the SPA set-password screen (includes Vite base / GitHub Pages path). */
export function buildPasswordSetupPublicUrl(token) {
	const base = import.meta.env.BASE_URL || "/";
	const root = base.endsWith("/") ? base.slice(0, -1) : base || "";
	const path = root === "" ? "/set-password" : `${root}/set-password`;
	const qs = `?token=${encodeURIComponent(token)}`;
	if (typeof window !== "undefined") {
		return `${window.location.origin}${path}${qs}`;
	}
	return `${path}${qs}`;
}

/**
 * @returns {Promise<{ passwordSetupToken: string, passwordSetupExpiresAt: string }>}
 */
export async function issuePasswordSetupToken(crmUserId) {
	if (!isSanityConfigured()) throw new Error("SANITY_NOT_CONFIGURED");
	const c = client();
	const id = String(crmUserId || "").trim();
	if (!id) throw new Error("CRM_USER_ID_REQUIRED");
	const passwordSetupToken = generatePasswordSetupSecret();
	const passwordSetupExpiresAt = new Date(
		Date.now() + 7 * 24 * 60 * 60 * 1000,
	).toISOString();
	await c
		.patch(id)
		.set({ passwordSetupToken, passwordSetupExpiresAt })
		.unset(["passwordSetupUsedAt"])
		.commit();
	return { passwordSetupToken, passwordSetupExpiresAt };
}

/** Resolve invite by token (valid, unused, not expired). */
export async function getCrmUserByPasswordSetupToken(token) {
	if (!isSanityConfigured()) return null;
	const t = String(token || "").trim();
	if (!t) return null;
	const c = client();
	const row = await c.fetch(
		`*[_type == "crmUser" && passwordSetupToken == $t && !defined(passwordSetupUsedAt)][0]{
      _id,
      email,
      passwordSetupExpiresAt
    }`,
		{ t },
	);
	if (!row?.email || !row.passwordSetupExpiresAt) return null;
	if (new Date(row.passwordSetupExpiresAt).getTime() <= Date.now()) return null;
	return { _id: row._id, email: String(row.email).trim().toLowerCase() };
}

export async function consumePasswordSetupToken(crmUserId) {
	if (!isSanityConfigured()) throw new Error("SANITY_NOT_CONFIGURED");
	const c = client();
	const id = String(crmUserId || "").trim();
	if (!id) throw new Error("CRM_USER_ID_REQUIRED");
	await c
		.patch(id)
		.set({ passwordSetupUsedAt: new Date().toISOString() })
		.unset(["passwordSetupToken", "passwordSetupExpiresAt"])
		.commit();
}

/** Update login metadata for an existing crmUser (no-op if no document). */
export async function recordCrmUserLogin({ email, displayName }) {
	if (!isSanityConfigured()) return;
	const e = String(email || "").trim().toLowerCase();
	if (!e) return;
	const c = client();
	const doc = await getCrmUserByEmail(e);
	if (!doc?._id) return;
	const name = String(displayName || "").trim();
	const fields = {
		lastLoginAt: new Date().toISOString(),
		...(name ? { displayName: name } : {}),
	};
	await c.patch(doc._id).set(fields).commit();
}

/**
 * @param {{ email: string, displayName?: string, role: string, permissionOverrides?: object }} row
 */
export async function upsertCrmUser(row) {
	if (!isSanityConfigured()) throw new Error("SANITY_NOT_CONFIGURED");
	const c = client();
	const email = String(row.email || "").trim().toLowerCase();
	if (!email) throw new Error("Email required");
	const _id = crmUserDocumentId(email);
	const existing = await c.fetch(`*[_id == $id][0]`, { id: _id });
	const doc = {
		_id,
		_type: "crmUser",
		email,
		displayName: row.displayName ?? "",
		role: row.role || "user",
		permissionOverrides: row.permissionOverrides || {},
	};
	if (existing?.passwordSetupToken != null) {
		doc.passwordSetupToken = existing.passwordSetupToken;
		doc.passwordSetupExpiresAt = existing.passwordSetupExpiresAt;
	}
	if (existing?.passwordSetupUsedAt != null) {
		doc.passwordSetupUsedAt = existing.passwordSetupUsedAt;
	}
	if (existing?.lastLoginAt != null) {
		doc.lastLoginAt = existing.lastLoginAt;
	}
	await c.createOrReplace(doc);
	return _id;
}

export async function deleteCrmUserById(id) {
	if (!isSanityConfigured()) return;
	const c = client();
	await c.delete(String(id));
}

/**
 * Leads in Sanity for CSV export (date strings YYYY-MM-DD compared inclusively).
 * @param {{ from: string, to: string }} range ISO dates yyyy-mm-dd
 */
export async function fetchLeadsInDateRange(range) {
	if (!isSanityConfigured()) throw new Error("SANITY_NOT_CONFIGURED");
	const c = client();
	const from = String(range.from || "").trim();
	const to = String(range.to || "").trim();
	if (!from || !to) throw new Error("FROM_TO_REQUIRED");
	return c.fetch(
		`*[_type == "lead" && defined(date) && date >= $from && date <= $to] | order(date desc) {
      date, name, phone, email, car, source, status, notes, handledBy, followUpDate,
      gmailMessageId, leadOrigin, subject, snippet
    }`,
		{ from, to },
	);
}
