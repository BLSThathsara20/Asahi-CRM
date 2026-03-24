/**
 * Turn Google Sheets API error JSON into a short message for users.
 * @param {number} status HTTP status
 * @param {string} bodyText response body (often JSON)
 */
export function messageFromSheetsResponse(status, bodyText) {
	let parsed = null;
	try {
		parsed = JSON.parse(bodyText);
	} catch {
		/* not JSON */
	}
	const apiErr = parsed?.error;
	const reasons = apiErr?.errors?.map((e) => e.reason) || [];
	const reason0 = reasons[0];
	const msg = String(apiErr?.message || "");

	if (status === 401) {
		return "Your Google session expired. Sign out and sign in again to refresh access.";
	}

	if (status === 403) {
		if (
			reason0 === "SERVICE_DISABLED" ||
			msg.includes("has not been used") ||
			msg.includes("it is disabled") ||
			msg.includes("API has not been used")
		) {
			return "Google Sheets API is not enabled for your Firebase project. In Google Cloud Console, open the same project as Firebase (e.g. asahi-crm) → APIs & Services → Library → search “Google Sheets API” → Enable. Wait a minute, then refresh this page.";
		}
		if (
			reason0 === "PERMISSION_DENIED" ||
			msg.includes("does not have permission") ||
			msg.includes("Request had insufficient authentication scopes")
		) {
			return "Access denied to the spreadsheet. Make sure the Google account you signed in with has been given access to the sheet (Editor), and that sign-in included permission for Google Sheets.";
		}
		return "Google blocked this request (403). Check that Sheets API is enabled and the spreadsheet is shared with your account.";
	}

	if (status === 404) {
		return 'Spreadsheet or tab not found. Confirm the Sheet ID and that a tab named exactly "All leads" exists.';
	}

	if (status === 400) {
		if (msg.length > 0 && msg.length < 280) return msg;
		return "The spreadsheet rejected the request. Check column layout and sheet name.";
	}

	if (apiErr?.message && apiErr.message.length < 280) {
		return apiErr.message;
	}

	return `Could not talk to Google Sheets (error ${status}). If this continues, contact your administrator.`;
}

/** Normalize any thrown Sheets error (including legacy raw JSON strings) for display */
export function formatSheetsThrownError(err) {
	if (!err?.message) return "Something went wrong with Google Sheets.";
	const m = err.message;
	if (m === "UNAUTHORIZED") return m;
	if (m.startsWith("{")) {
		try {
			const p = JSON.parse(m);
			const code =
				typeof p?.error?.code === "number" ? p.error.code : 500;
			return messageFromSheetsResponse(code, m);
		} catch {
			return m;
		}
	}
	return m;
}
