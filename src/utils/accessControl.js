import { ALLOWED_EMAIL_DOMAINS, SUPERADMIN_EMAIL_DOMAINS } from "../constants.js";

/** Company domains: default to CRM manager permissions unless a crmUser doc overrides. */
export function isCompanyEmail(email) {
	if (!email) return false;
	const lower = String(email).trim().toLowerCase();
	return ALLOWED_EMAIL_DOMAINS.some((d) =>
		lower.endsWith(d.toLowerCase()),
	);
}

/** Domains that always resolve to superadmin (overrides Sanity crmUser role). */
export function isSuperadminDomainEmail(email) {
	if (!email) return false;
	const lower = String(email).trim().toLowerCase();
	return SUPERADMIN_EMAIL_DOMAINS.some((d) =>
		lower.endsWith(d.toLowerCase()),
	);
}

/**
 * Any Google account may sign in. CRM capabilities come from {@link resolveUserAccess}
 * (company domain defaults, Sanity crmUser, or guest).
 */
export function signInAllowed(email) {
	return Boolean(String(email || "").trim().includes("@"));
}
