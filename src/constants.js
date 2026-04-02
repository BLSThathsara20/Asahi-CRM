/** Sign-in allowed only for these email domains. */
export const ALLOWED_EMAIL_DOMAINS = [
	"@asahigroup.co.uk",
	"@asahimotors.co.uk",
];

/**
 * These domains always get the superadmin role (Team, full permissions).
 * @asahimotors stays default CRM manager unless a Sanity crmUser overrides.
 */
export const SUPERADMIN_EMAIL_DOMAINS = ["@asahigroup.co.uk"];

export function formatAllowedDomainsForUi() {
	return ALLOWED_EMAIL_DOMAINS.join(" · ");
}

export const LOGO_URL =
	"https://asahigroup.co.uk/admin/uploaded_photos/site_logo.png";

export const STATUSES = [
	"New",
	"Contacted",
	"Follow-up",
	"Done",
	"Sold",
	"Lost",
];

/**
 * Gmail user labels → CRM source name. Create matching labels & filters in Gmail.
 * Same message in multiple labels: Autotrader wins over other sources.
 */
export const GMAIL_LEAD_LABELS = [
	{ gmailName: "Autotrader", source: "Autotrader" },
	{ gmailName: "Website", source: "Website" },
	{ gmailName: "Car Dealer", source: "Car Dealer" },
];

/** Default source when adding a walk-in / showroom lead (Sanity only). */
export const PHYSICAL_LEAD_SOURCE = "Physical";

/** Dashboard source tabs: value '' = all, or source name, or '__physical__' */
export const DASHBOARD_SOURCE_TABS = [
	{ value: "", label: "All" },
	{ value: "Autotrader", label: "Autotrader" },
	{ value: "Website", label: "Website" },
	{ value: "Car Dealer", label: "Car dealer" },
	{ value: "__physical__", label: "Physical" },
];

/** Applied when user taps "Mark as Done" */
export const GMAIL_DONE_LABEL_NAME = "DONE AT";

/** Used in AI prompts and dealership copy (if you add AI helpers later). */
export const DEALERSHIP_ADDRESS_LINE =
	"Our address is 231 Colney Hatch Lane, Asahi Motors, Barnet, London, N11 3DG";

export const DEALERSHIP_HOURS_LINE =
	"We are open 7 days a week. Monday–Sat 10:30–7pm and Sundays 12:30–3:30pm";

export const DEALERSHIP_SIGN_OFF = `Kind regards,
Asahi Motors Team`;

export const DEALERSHIP_PHONE = "020 3004 9612";

export const DEALERSHIP_WEB = "www.asahigroup.co.uk";
