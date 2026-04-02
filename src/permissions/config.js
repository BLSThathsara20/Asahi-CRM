/**
 * CRM capability flags (flattened for checks and user-management checkboxes).
 * @typedef {{
 *   viewShell: boolean;
 *   viewPipeline: boolean;
 *   viewLeadDetail: boolean;
 *   editLeads: boolean;
 *   gmailAccess: boolean;
 *   addPhysicalLeads: boolean;
 *   exportData: boolean;
 *   manageUsers: boolean;
 * }} CrmPermissions
 */

const deny = {
	viewShell: false,
	viewPipeline: false,
	viewLeadDetail: false,
	editLeads: false,
	gmailAccess: false,
	addPhysicalLeads: false,
	exportData: false,
	manageUsers: false,
};

const fullCrm = {
	viewShell: true,
	viewPipeline: true,
	viewLeadDetail: true,
	editLeads: true,
	gmailAccess: true,
	addPhysicalLeads: true,
	exportData: true,
	manageUsers: false,
};

/** Role keys stored in Sanity `crmUser.role` */
export const CRM_ROLE_KEYS = [
	"superadmin",
	"admin",
	"crm_manager",
	"mechanic",
	"user",
	"guest",
];

/** Default permission matrix per role (before per-user overrides). */
export const ROLE_PERMISSIONS = {
	superadmin: {
		viewShell: true,
		viewPipeline: true,
		viewLeadDetail: true,
		editLeads: true,
		gmailAccess: true,
		addPhysicalLeads: true,
		exportData: true,
		manageUsers: true,
	},
	admin: {
		viewShell: true,
		viewPipeline: true,
		viewLeadDetail: true,
		editLeads: true,
		gmailAccess: true,
		addPhysicalLeads: true,
		exportData: true,
		manageUsers: true,
	},
	crm_manager: {
		...fullCrm,
		manageUsers: false,
	},
	mechanic: {
		viewShell: true,
		viewPipeline: true,
		viewLeadDetail: true,
		editLeads: false,
		gmailAccess: true,
		addPhysicalLeads: false,
		exportData: false,
		manageUsers: false,
	},
	user: {
		viewShell: true,
		viewPipeline: false,
		viewLeadDetail: false,
		editLeads: false,
		gmailAccess: false,
		addPhysicalLeads: false,
		exportData: false,
		manageUsers: false,
	},
	guest: {
		...deny,
		viewShell: true,
	},
};

/** Labels for UI (settings / user admin). */
export const PERMISSION_LABELS = {
	viewShell: "See app & signed-in home",
	viewPipeline: "View lead pipeline (Gmail + CRM)",
	viewLeadDetail: "Open lead details",
	editLeads: "Edit fields & sync to CRM",
	gmailAccess: "Connect Gmail (read enquiry labels)",
	addPhysicalLeads: "Add physical / walk-in leads",
	exportData: "Export leads (CSV, date range)",
	manageUsers: "Manage users & roles",
};

export const ROLE_LABELS = {
	superadmin: "Superadmin",
	admin: "Admin",
	crm_manager: "CRM manager",
	mechanic: "Mechanic",
	user: "User (limited)",
	guest: "Guest",
};

/** @param {string} role */
export function permissionsForRole(role) {
	const key = String(role || "guest").toLowerCase();
	const row = ROLE_PERMISSIONS[key];
	if (row) return { ...row };
	return { ...ROLE_PERMISSIONS.guest };
}

/**
 * @param {string} role
 * @param {Partial<CrmPermissions> | null | undefined} overrides
 */
export function mergeRoleWithOverrides(role, overrides) {
	const base = permissionsForRole(role);
	const out = { ...base };
	if (overrides && typeof overrides === "object") {
		for (const k of Object.keys(PERMISSION_LABELS)) {
			if (overrides[k] !== undefined) out[k] = Boolean(overrides[k]);
		}
	}
	return out;
}
