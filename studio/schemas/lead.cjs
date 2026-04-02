const { defineField, defineType } = require("sanity");

const lead = defineType({
	name: "lead",
	title: "Lead",
	type: "document",
	fields: [
		defineField({
			name: "gmailMessageId",
			title: "Gmail message ID",
			type: "string",
			description: "Empty for walk-in / manual leads.",
		}),
		defineField({
			name: "leadOrigin",
			title: "Origin",
			type: "string",
			description: "gmail or physical",
			options: {
				list: [
					{ title: "Gmail", value: "gmail" },
					{ title: "Physical / manual", value: "physical" },
				],
			},
		}),
		defineField({ name: "date", title: "Date", type: "string" }),
		defineField({ name: "name", title: "Name", type: "string" }),
		defineField({ name: "phone", title: "Phone", type: "string" }),
		defineField({ name: "email", title: "Email", type: "string" }),
		defineField({ name: "car", title: "Car", type: "string" }),
		defineField({ name: "source", title: "Source", type: "string" }),
		defineField({ name: "status", title: "Status", type: "string" }),
		defineField({ name: "notes", title: "Notes", type: "string" }),
		defineField({ name: "handledBy", title: "Handled by", type: "string" }),
		defineField({
			name: "followUpDate",
			title: "Follow-up date",
			type: "string",
		}),
		defineField({ name: "subject", title: "Subject", type: "string" }),
		defineField({ name: "snippet", title: "Snippet", type: "string" }),
		defineField({ name: "bodyText", title: "Body (plain text)", type: "text" }),
		defineField({
			name: "gmailMarkedDoneAt",
			title: "Gmail marked done at",
			type: "string",
			description:
				"ISO timestamp when staff used Mark as Done (Gmail DONE AT + CRM). Clear to undo in CRM.",
		}),
	],
	preview: {
		select: {
			title: "name",
			subtitle: "email",
			source: "source",
		},
		prepare({ title, subtitle, source }) {
			return {
				title: title || subtitle || "Lead",
				subtitle: [source, subtitle].filter(Boolean).join(" · "),
			};
		},
	},
});

module.exports = { lead };
