import { GoogleAuthProvider } from "firebase/auth";

/**
 * Google OAuth access token for Gmail APIs.
 * Prefer `credentialFromResult`: with extra `addScope()` calls, this token is
 * more reliably than `_tokenResponse.oauthAccessToken`.
 */
export function extractGoogleAccessToken(result) {
	if (!result) return null;
	const cred = GoogleAuthProvider.credentialFromResult(result);
	if (cred?.accessToken) return cred.accessToken;
	const tr = result._tokenResponse;
	if (tr?.oauthAccessToken) return tr.oauthAccessToken;
	return null;
}

/** Returns space-separated scope string from Google's tokeninfo, or null. */
export async function fetchAccessTokenScopes(accessToken) {
	if (!accessToken) return null;
	try {
		const url = `https://oauth2.googleapis.com/tokeninfo?access_token=${encodeURIComponent(accessToken)}`;
		const res = await fetch(url);
		if (!res.ok) return null;
		const data = await res.json();
		return typeof data.scope === "string" ? data.scope : null;
	} catch {
		return null;
	}
}
