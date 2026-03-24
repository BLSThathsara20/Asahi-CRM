/** User-facing text for Firebase Auth error codes */
export function getAuthErrorMessage(code, fallback) {
	switch (code) {
		case "auth/unauthorized-domain":
			return "This website’s domain is not allowed to use Google sign-in. In Firebase Console open Authentication → Settings → Authorized domains and add: blsthathsara20.github.io (for local dev, localhost is usually already listed).";
		case "auth/popup-blocked":
			return "Your browser blocked the sign-in popup. Allow popups for this site, or try again.";
		case "auth/popup-closed-by-user":
			return "The Google sign-in window was closed before finishing. Try again if you want to sign in.";
		case "auth/cancelled-popup-request":
			return "Another sign-in request is already in progress. Wait a moment and try again.";
		case "auth/network-request-failed":
			return "Network error. Check your connection and try again.";
		case "auth/too-many-requests":
			return "Too many attempts. Please wait a few minutes and try again.";
		case "auth/operation-not-allowed":
			return "Google sign-in is not enabled for this project. In Firebase Console enable Google under Authentication → Sign-in method.";
		case "auth/internal-error":
			return "Something went wrong on the sign-in service. Try again in a moment.";
		case "auth/account-exists-with-different-credential":
			return "An account already exists with a different sign-in method. Use the method you used originally.";
		default:
			if (fallback && typeof fallback === "string" && fallback.length < 200) {
				return fallback;
			}
			return "Sign-in failed. Please try again. If it keeps happening, contact your administrator.";
	}
}
