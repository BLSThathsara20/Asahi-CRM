import { doc, getDoc } from "firebase/firestore";
import {
	ALLOWED_EMAIL_DOMAINS,
	FIRESTORE_EXTRA_ALLOWED_COLLECTION,
	SUPER_ADMIN_EMAILS,
} from "../constants.js";

export function normalizeEmail(email) {
	return String(email || "").trim().toLowerCase();
}

export function isSuperAdminEmail(email) {
	const n = normalizeEmail(email);
	return SUPER_ADMIN_EMAILS.some((e) => n === e.toLowerCase());
}

export function isDomainAllowedEmail(email) {
	const lower = normalizeEmail(email);
	return ALLOWED_EMAIL_DOMAINS.some((d) =>
		lower.endsWith(d.toLowerCase()),
	);
}

/** Domain / super admin only — no async (no Firestore). */
export function isCompanyOrSuperAdminEmail(email) {
	if (!email) return false;
	return isSuperAdminEmail(email) || isDomainAllowedEmail(email);
}

/**
 * Full access: company domain, super admin, or doc in Firestore `crmExtraAllowedUsers`.
 */
export async function canAccessApp(email, firestore) {
	if (!email) return false;
	if (isSuperAdminEmail(email)) return true;
	if (isDomainAllowedEmail(email)) return true;
	if (!firestore) return false;
	try {
		const ref = doc(
			firestore,
			FIRESTORE_EXTRA_ALLOWED_COLLECTION,
			normalizeEmail(email),
		);
		const snap = await getDoc(ref);
		return snap.exists();
	} catch {
		return false;
	}
}
