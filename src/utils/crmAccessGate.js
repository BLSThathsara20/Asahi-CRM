import { getCrmUserByEmail } from "../services/sanityCrmUsersApi.js";
import { isSanityConfigured } from "../services/sanityLeadsApi.js";
import { isCompanyEmail } from "./accessControl.js";

export function superadminEmails() {
	const raw = import.meta.env.VITE_SUPERADMIN_EMAILS || "";
	return raw
		.split(/[,;\s]+/)
		.map((s) => s.trim().toLowerCase())
		.filter(Boolean);
}

/**
 * After Google sign-in, allow:
 * - {@link superadminEmails}
 * - Company domain addresses ({@link isCompanyEmail}) — no Sanity row required
 * - Any email with a Sanity `crmUser` role (for partners / limited external accounts)
 */
export async function isCrmAccessGranted(email) {
	const e = String(email || "").trim().toLowerCase();
	if (!e) return false;

	const supers = superadminEmails();
	if (supers.length && supers.includes(e)) return true;

	if (isCompanyEmail(email)) return true;

	if (!isSanityConfigured()) return false;

	try {
		const doc = await getCrmUserByEmail(e);
		return Boolean(doc?.role);
	} catch {
		return false;
	}
}
