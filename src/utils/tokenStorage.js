const KEY = "asahi_sheets_token";
const EXP_KEY = "asahi_sheets_token_exp";

/** Google OAuth access tokens last ~1 hour; cache slightly under that. */
const DEFAULT_TTL_MS = 58 * 60 * 1000;

/** @returns {string | null} */
export function getStoredSheetsToken() {
	try {
		const exp = Number(localStorage.getItem(EXP_KEY) || 0);
		if (!exp || Date.now() > exp) {
			clearStoredSheetsToken();
			return null;
		}
		return localStorage.getItem(KEY);
	} catch {
		return null;
	}
}

export function setStoredSheetsToken(token, ttlMs = DEFAULT_TTL_MS) {
	try {
		localStorage.setItem(KEY, token);
		localStorage.setItem(EXP_KEY, String(Date.now() + ttlMs));
	} catch {
		/* ignore */
	}
}

export function clearStoredSheetsToken() {
	try {
		localStorage.removeItem(KEY);
		localStorage.removeItem(EXP_KEY);
	} catch {
		/* ignore */
	}
}
