const { defineConfig } = require("sanity");
const { structureTool } = require("sanity/structure");
const { crmUser } = require("./schemas/crmUser.cjs");
const { lead } = require("./schemas/lead.cjs");

module.exports = defineConfig({
	name: "asahi-motors-crm",
	title: "Asahi Motors CRM",
	projectId: "ts0jmi7u",
	dataset: "production",
	plugins: [structureTool()],
	schema: {
		types: [lead, crmUser],
	},
});
