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
			return "This sign-in method is not enabled. In Firebase Console open Authentication → Sign-in method and enable Email/Password (and Google only if you link Gmail).";
		case "auth/invalid-email":
			return "That email address doesn’t look valid.";
		case "auth/invalid-credential":
		case "auth/wrong-password":
			return "Wrong email or password. Try again or use “Forgot password”.";
		case "auth/user-not-found":
			return "No account for that email. Use “Create account” if you’ve been invited, or check the spelling.";
		case "auth/email-already-in-use":
			return "That email is already registered. Sign in instead.";
		case "auth/weak-password":
			return "Password is too weak. Use at least 6 characters.";
		case "auth/user-disabled":
			return "This account has been disabled. Contact your administrator.";
		case "auth/internal-error":
			return "Something went wrong on the sign-in service. Try again in a moment.";
		case "auth/account-exists-with-different-credential":
			return "An account already exists with a different sign-in method. Use the method you used originally.";
		case "auth/credential-already-in-use":
			return "That Google account is already linked to another login. Use the same email/password as your CRM user, or the Google sign-in you used before.";
		default:
			if (fallback && typeof fallback === "string" && fallback.length < 200) {
				return fallback;
			}
			return "Sign-in failed. Please try again. If it keeps happening, contact your administrator.";
	}
}
