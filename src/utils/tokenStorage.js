const KEY = "asahi_google_api_token";
const EXP_KEY = "asahi_google_api_token_exp";
/** Earlier builds stored under this name; migrate once. */
const LEGACY_KEY = "asahi_sheets_token";
const LEGACY_EXP = "asahi_sheets_token_exp";

/** Google OAuth access tokens last ~1 hour; cache slightly under that. */
const DEFAULT_TTL_MS = 58 * 60 * 1000;

function readToken(k, expK) {
	const exp = Number(localStorage.getItem(expK) || 0);
	if (!exp || Date.now() > exp) {
		try {
			localStorage.removeItem(k);
			localStorage.removeItem(expK);
		} catch {
			/* ignore */
		}
		return null;
	}
	return localStorage.getItem(k);
}

/** @returns {string | null} */
export function getStoredGoogleAccessToken() {
	try {
		let token = readToken(KEY, EXP_KEY);
		if (token) return token;
		token = readToken(LEGACY_KEY, LEGACY_EXP);
		if (token) {
			setStoredGoogleAccessToken(token);
			try {
				localStorage.removeItem(LEGACY_KEY);
				localStorage.removeItem(LEGACY_EXP);
			} catch {
				/* ignore */
			}
		}
		return token;
	} catch {
		return null;
	}
}

export function setStoredGoogleAccessToken(token, ttlMs = DEFAULT_TTL_MS) {
	try {
		localStorage.setItem(KEY, token);
		localStorage.setItem(EXP_KEY, String(Date.now() + ttlMs));
	} catch {
		/* ignore */
	}
}

export function clearStoredGoogleAccessToken() {
	try {
		localStorage.removeItem(KEY);
		localStorage.removeItem(EXP_KEY);
		localStorage.removeItem(LEGACY_KEY);
		localStorage.removeItem(LEGACY_EXP);
	} catch {
		/* ignore */
	}
}
