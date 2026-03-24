export const SHEET_ID = "1InIVCf23cdlOZHsvl25uQUut9O9HPGlFJBeoYen-aAs";
export const SHEET_NAME = "All leads";

/** Sign-in allowed only for these email suffixes (lowercase). */
export const ALLOWED_EMAIL_DOMAINS = [
	"@asahigroup.co.uk",
	"@asahimotors.co.uk",
];

export function formatAllowedDomainsForUi() {
	return ALLOWED_EMAIL_DOMAINS.join(" · ");
}

export const LOGO_URL =
	"https://asahigroup.co.uk/admin/uploaded_photos/site_logo.png";

export const SOURCES = ["Autotrader", "Website", "Phone", "Walk-in"];

export const STATUSES = [
	"New",
	"Contacted",
	"Follow-up",
	"Sold",
	"Lost",
];

export const COLS = {
	date: 0,
	name: 1,
	phone: 2,
	email: 3,
	car: 4,
	source: 5,
	status: 6,
	notes: 7,
};
