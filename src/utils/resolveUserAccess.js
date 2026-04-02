import {
	mergeRoleWithOverrides,
	permissionsForRole,
} from "../permissions/config.js";
import { getCrmUserByEmail } from "../services/sanityCrmUsersApi.js";
import { isSanityConfigured } from "../services/sanityLeadsApi.js";
import { isCompanyEmail, isSuperadminDomainEmail } from "./accessControl.js";
import { superadminEmails } from "./crmAccessGate.js";

/**
 * Gmail enquiry sync & live link flow are only for company (Asahi) domains.
 */
function stripGmailForNonCompany(email, out) {
	if (isCompanyEmail(email)) return out;
	return {
		...out,
		permissions: { ...out.permissions, gmailAccess: false },
	};
}

/**
 * Resolves CRM permissions for a signed-in user who passed {@link isCrmAccessGranted}.
 *
 * @param {string} email
 * @returns {Promise<{ role: string, permissions: ReturnType<typeof mergeRoleWithOverrides> }>}
 */
export async function resolveUserAccess(email) {
	const e = String(email || "").trim().toLowerCase();
	const superList = superadminEmails();
	if (superList.length && superList.includes(e)) {
		const permissions = mergeRoleWithOverrides("superadmin", null);
		return stripGmailForNonCompany(email, {
			role: "superadmin",
			permissions,
		});
	}

	if (isSuperadminDomainEmail(email)) {
		const permissions = mergeRoleWithOverrides("superadmin", null);
		return stripGmailForNonCompany(email, {
			role: "superadmin",
			permissions,
		});
	}

	let doc = null;
	if (isSanityConfigured()) {
		try {
			doc = await getCrmUserByEmail(e);
		} catch {
			doc = null;
		}
	}

	if (doc?.role) {
		const permissions = mergeRoleWithOverrides(
			doc.role,
			doc.permissionOverrides,
		);
		return stripGmailForNonCompany(email, { role: doc.role, permissions });
	}

	if (isCompanyEmail(email)) {
		const permissions = mergeRoleWithOverrides("crm_manager", null);
		return { role: "crm_manager", permissions };
	}

	const permissions = permissionsForRole("guest");
	return stripGmailForNonCompany(email, { role: "guest", permissions });
}
