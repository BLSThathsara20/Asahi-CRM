const KEY = "asahi_sheets_token";
const EXP_KEY = "asahi_sheets_token_exp";

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

export function setStoredSheetsToken(token, ttlMs = 50 * 60 * 1000) {
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
