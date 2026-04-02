/**
 * Turn Google API error JSON (Gmail, etc.) into a short message for users.
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
			return "A Google API is not enabled for this Cloud project. In Google Cloud Console (same project as Firebase) → APIs & Services → Library, enable Gmail API, wait briefly, then try again.";
		}
		if (
			reason0 === "PERMISSION_DENIED" ||
			msg.includes("does not have permission") ||
			msg.includes("Request had insufficient authentication scopes")
		) {
			return "Google denied this request. Confirm Gmail scopes are on the OAuth consent screen, add test users if the app is in Testing, then use Connect Gmail again.";
		}
		return "Google blocked this request (403). Check Gmail API and OAuth scopes.";
	}

	if (status === 404) {
		return "Google API returned not found (404). If this persists, try reconnecting Gmail.";
	}

	if (status === 400) {
		if (msg.length > 0 && msg.length < 280) return msg;
		return "Google rejected this request (400).";
	}

	if (apiErr?.message && apiErr.message.length < 280) {
		return apiErr.message;
	}

	return `Could not reach Google (error ${status}). If this continues, contact your administrator.`;
}

/** Normalize any thrown Google API error (including legacy raw JSON strings) for display */
export function formatSheetsThrownError(err) {
	if (!err?.message) return "Something went wrong talking to Google.";
	const m = err.message;
	if (m === "UNAUTHORIZED") return m;
	if (m === "GOOGLE_API_NOT_CONNECTED" || m === "SHEETS_NOT_CONNECTED") {
		return "Google isn’t connected for Gmail. Use “Continue with Google” on the connection screen, then try again.";
	}
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
