import { GoogleAuthProvider } from "firebase/auth";

/**
 * Google OAuth access token for Sheets API.
 * After redirect sign-in, the token is often on `_tokenResponse.oauthAccessToken`, not only on `credential.accessToken`.
 */
export function extractGoogleAccessToken(result) {
	if (!result) return null;
	const tr = result._tokenResponse;
	if (tr?.oauthAccessToken) return tr.oauthAccessToken;
	const cred = GoogleAuthProvider.credentialFromResult(result);
	if (cred?.accessToken) return cred.accessToken;
	return null;
}
