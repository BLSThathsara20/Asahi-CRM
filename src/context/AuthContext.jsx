import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useState,
} from "react";
import {
	GoogleAuthProvider,
	getRedirectResult,
	linkWithPopup,
	onAuthStateChanged,
	reauthenticateWithPopup,
	sendPasswordResetEmail,
	signInWithEmailAndPassword,
	signInWithPopup,
	signOut,
} from "firebase/auth";
import { auth, isFirebaseConfigured } from "../firebase.js";
import { getAuthErrorMessage } from "../utils/authErrors.js";
import { signInAllowed } from "../utils/accessControl.js";
import { isCrmAccessGranted } from "../utils/crmAccessGate.js";
import { recordCrmUserLogin } from "../services/sanityCrmUsersApi.js";
import { extractGoogleAccessToken } from "../utils/googleOAuthToken.js";
import {
	clearStoredGoogleAccessToken,
	getStoredGoogleAccessToken,
	setStoredGoogleAccessToken,
} from "../utils/tokenStorage.js";

const GMAIL_READONLY_SCOPE = "https://www.googleapis.com/auth/gmail.readonly";
/** Send mail, modify labels, mark read, etc. */
const GMAIL_MODIFY_SCOPE = "https://www.googleapis.com/auth/gmail.modify";

const AuthContext = createContext(null);

/**
 * @param {{ forceConsent?: boolean }} opts
 * Use `forceConsent` when re-approving so Google issues a token that includes
 * newly added scopes (e.g. gmail.modify). Without it, Google may return a cached token without Gmail.
 */
function googleProvider({ forceConsent = false } = {}) {
	const p = new GoogleAuthProvider();
	p.addScope(GMAIL_READONLY_SCOPE);
	p.addScope(GMAIL_MODIFY_SCOPE);
	const params = {
		// Incremental auth: returned access token should list all granted scopes.
		include_granted_scopes: "true",
	};
	if (forceConsent) {
		params.prompt = "consent";
	}
	p.setCustomParameters(params);
	return p;
}

export function AuthProvider({ children }) {
	const [user, setUser] = useState(null);
	const [authReady, setAuthReady] = useState(false);
	const [accessDenied, setAccessDenied] = useState(false);
	const [googleAccessToken, setGoogleAccessTokenState] = useState(() =>
		getStoredGoogleAccessToken(),
	);
	const [authMessage, setAuthMessage] = useState(null);
	const [signInLoading, setSignInLoading] = useState(false);

	const syncTokenFromStorage = useCallback(() => {
		const t = getStoredGoogleAccessToken();
		setGoogleAccessTokenState(t);
		return t;
	}, []);

	const invalidateGoogleAccessToken = useCallback(() => {
		clearStoredGoogleAccessToken();
		setGoogleAccessTokenState(null);
	}, []);

	/** Firebase sign-in OK + valid cached Google OAuth access token (Gmail API) */
	const googleAccessSessionReady = Boolean(googleAccessToken);

	useEffect(() => {
		if (!auth) {
			setAuthReady(true);
			return;
		}

		let unsub = () => {};

		(async () => {
			try {
				const result = await getRedirectResult(auth);
				if (result?.user) {
					const email = result.user.email;
					if (
						!signInAllowed(email) ||
						!(await isCrmAccessGranted(email))
					) {
						await signOut(auth);
						setAccessDenied(true);
					} else {
						setAccessDenied(false);
						const token = extractGoogleAccessToken(result);
						if (token) {
							setStoredGoogleAccessToken(token);
							setGoogleAccessTokenState(token);
						}
					}
				}
			} catch (e) {
				console.error(e);
				const code = e?.code;
				if (code && code !== "auth/popup-closed-by-user") {
					setAuthMessage({
						type: "error",
						message: getAuthErrorMessage(code, e?.message),
					});
				}
			}

			unsub = onAuthStateChanged(auth, (u) => {
				void (async () => {
					if (!u) {
						invalidateGoogleAccessToken();
						setUser(null);
						setAccessDenied(false);
						setAuthReady(true);
						return;
					}
					if (!signInAllowed(u.email)) {
						setAccessDenied(true);
						await signOut(auth);
						invalidateGoogleAccessToken();
						setUser(null);
						setAuthReady(true);
						return;
					}
					try {
						const granted = await isCrmAccessGranted(u.email);
						if (!granted) {
							setAccessDenied(true);
							await signOut(auth);
							invalidateGoogleAccessToken();
							setUser(null);
							setAuthReady(true);
							return;
						}
						setAccessDenied(false);
						try {
							await recordCrmUserLogin({
								email: u.email,
								displayName: u.displayName || "",
							});
						} catch (err) {
							console.warn("[Auth] recordCrmUserLogin:", err);
						}
						const t = getStoredGoogleAccessToken();
						setGoogleAccessTokenState(t);
						setUser(u);
					} catch (e) {
						console.error(e);
						setAccessDenied(true);
						await signOut(auth);
						invalidateGoogleAccessToken();
						setUser(null);
					} finally {
						setAuthReady(true);
					}
				})();
			});
		})();

		return () => unsub();
	}, [invalidateGoogleAccessToken]);

	const clearAuthMessage = useCallback(() => setAuthMessage(null), []);

	const signInWithEmailPassword = useCallback(async (email, password) => {
		if (!auth) return;
		const em = String(email || "").trim();
		if (!signInAllowed(em)) {
			setAccessDenied(true);
			return;
		}
		setAccessDenied(false);
		setAuthMessage(null);
		setSignInLoading(true);
		try {
			await signInWithEmailAndPassword(auth, em, password);
		} catch (e) {
			const code = e?.code;
			setAuthMessage({
				type: "error",
				message: getAuthErrorMessage(code, e?.message),
			});
			console.error(e);
		} finally {
			setSignInLoading(false);
		}
	}, []);

	const sendPasswordReset = useCallback(async (email) => {
		if (!auth) return;
		const em = String(email || "").trim();
		if (!signInAllowed(em)) {
			setAuthMessage({
				type: "error",
				message: "Enter the email you use for this app.",
			});
			return;
		}
		setAuthMessage(null);
		setSignInLoading(true);
		try {
			await sendPasswordResetEmail(auth, em);
			setAuthMessage({
				type: "info",
				message:
					"If an account exists for that address, we sent a reset link. Check your inbox and spam.",
			});
		} catch (e) {
			const code = e?.code;
			setAuthMessage({
				type: "error",
				message: getAuthErrorMessage(code, e?.message),
			});
			console.error(e);
		} finally {
			setSignInLoading(false);
		}
	}, []);

	const signInWithGoogle = useCallback(async () => {
		if (!auth) return;
		setAccessDenied(false);
		setAuthMessage(null);
		setSignInLoading(true);
		try {
			/* Popup sign-in: required when the app is NOT on Firebase Hosting.
			   Redirect sign-in loads firebaseapp.com/__/auth/handler which needs
			   /__/firebase/init.json — only served by Firebase Hosting (404 on GH Pages). */
			const result = await signInWithPopup(auth, googleProvider());
			const email = result.user?.email;
			if (!signInAllowed(email)) {
				await signOut(auth);
				clearStoredGoogleAccessToken();
				setGoogleAccessTokenState(null);
				setAccessDenied(true);
				return;
			}
			if (!(await isCrmAccessGranted(email))) {
				await signOut(auth);
				clearStoredGoogleAccessToken();
				setGoogleAccessTokenState(null);
				setAccessDenied(true);
				return;
			}
			const token = extractGoogleAccessToken(result);
			if (token) {
				setStoredGoogleAccessToken(token);
				setGoogleAccessTokenState(token);
			}
		} catch (e) {
			const code = e?.code;
			const msg = getAuthErrorMessage(code, e?.message);
			if (
				code === "auth/popup-closed-by-user" ||
				code === "auth/cancelled-popup-request"
			) {
				setAuthMessage({ type: "info", message: msg });
			} else {
				setAuthMessage({
					type: "error",
					message: msg,
				});
			}
			console.error(e);
		} finally {
			setSignInLoading(false);
		}
	}, []);

	const signOutUser = useCallback(async () => {
		if (!auth) return;
		invalidateGoogleAccessToken();
		await signOut(auth);
	}, [invalidateGoogleAccessToken]);

	/**
	 * Gmail OAuth only (after email/password sign-in): link Google or re-auth
	 * if already linked.
	 */
	const connectGoogleAccess = useCallback(async () => {
		if (!auth?.currentUser) return;
		const u = auth.currentUser;
		const hasGoogle = u.providerData.some((p) => p.providerId === "google.com");
		const result = hasGoogle
			? await reauthenticateWithPopup(u, googleProvider({ forceConsent: true }))
			: await linkWithPopup(u, googleProvider({ forceConsent: true }));
		const token = extractGoogleAccessToken(result);
		if (token) {
			setStoredGoogleAccessToken(token);
			setGoogleAccessTokenState(token);
		} else {
			throw new Error(
				"Google did not return an access token. Try again or sign out and sign back in.",
			);
		}
	}, []);

	const getGoogleAccessToken = useCallback(async () => {
		const t = syncTokenFromStorage();
		return t;
	}, [syncTokenFromStorage]);

	const value = useMemo(
		() => ({
			isFirebaseConfigured,
			authReady,
			user,
			accessDenied,
			authMessage,
			clearAuthMessage,
			signInLoading,
			googleAccessToken,
			googleAccessSessionReady,
			signInWithEmailPassword,
			sendPasswordReset,
			signInWithGoogle,
			signOutUser,
			getGoogleAccessToken,
			connectGoogleAccess,
			invalidateGoogleAccessToken,
		}),
		[
			authReady,
			user,
			accessDenied,
			authMessage,
			clearAuthMessage,
			signInLoading,
			googleAccessToken,
			googleAccessSessionReady,
			signInWithEmailPassword,
			sendPasswordReset,
			signInWithGoogle,
			signOutUser,
			getGoogleAccessToken,
			connectGoogleAccess,
			invalidateGoogleAccessToken,
		],
	);

	return (
		<AuthContext.Provider value={value}>{children}</AuthContext.Provider>
	);
}

export function useAuth() {
	const ctx = useContext(AuthContext);
	if (!ctx) throw new Error("useAuth must be used within AuthProvider");
	return ctx;
}
