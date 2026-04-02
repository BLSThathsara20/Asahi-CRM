const { defineField, defineType } = require("sanity");

const overrideFields = [
	defineField({ name: "viewShell", title: "See app home", type: "boolean" }),
	defineField({ name: "viewPipeline", title: "View pipeline", type: "boolean" }),
	defineField({ name: "viewLeadDetail", title: "Open lead details", type: "boolean" }),
	defineField({ name: "editLeads", title: "Edit & sync leads", type: "boolean" }),
	defineField({ name: "gmailAccess", title: "Gmail connection", type: "boolean" }),
	defineField({ name: "addPhysicalLeads", title: "Add physical leads", type: "boolean" }),
	defineField({ name: "exportData", title: "Export CSV", type: "boolean" }),
	defineField({ name: "manageUsers", title: "User admin", type: "boolean" }),
];

const crmUser = defineType({
	name: "crmUser",
	title: "CRM user",
	type: "document",
	fields: [
		defineField({
			name: "email",
			title: "Email",
			type: "string",
			validation: (Rule) => Rule.required().email(),
		}),
		defineField({ name: "displayName", title: "Display name", type: "string" }),
		defineField({
			name: "lastLoginAt",
			title: "Last login (app)",
			type: "datetime",
			readOnly: true,
			description: "Set automatically when this user signs in.",
		}),
		defineField({
			name: "role",
			title: "Role",
			type: "string",
			options: {
				list: [
					{ title: "Superadmin", value: "superadmin" },
					{ title: "Admin", value: "admin" },
					{ title: "CRM manager", value: "crm_manager" },
					{ title: "Mechanic", value: "mechanic" },
					{ title: "User (limited)", value: "user" },
					{ title: "Guest", value: "guest" },
				],
			},
			initialValue: "user",
			validation: (Rule) => Rule.required(),
		}),
		defineField({
			name: "permissionOverrides",
			title: "Permission overrides",
			type: "object",
			description: "Leave unchecked to use role defaults; tick to force on/off.",
			fields: overrideFields,
		}),
		defineField({
			name: "passwordSetupToken",
			title: "Password setup token (internal)",
			type: "string",
			hidden: true,
			description: "One-time link token; cleared after use.",
		}),
		defineField({
			name: "passwordSetupExpiresAt",
			title: "Password setup link expires",
			type: "datetime",
			hidden: true,
		}),
		defineField({
			name: "passwordSetupUsedAt",
			title: "Password setup link used at",
			type: "datetime",
			hidden: true,
		}),
	],
	preview: {
		select: { title: "email", subtitle: "role" },
	},
});

module.exports = { crmUser };
