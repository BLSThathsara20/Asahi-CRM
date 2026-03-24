import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useState,
} from "react";
import {
	getRedirectResult,
	GoogleAuthProvider,
	onAuthStateChanged,
	reauthenticateWithPopup,
	signInWithPopup,
	signOut,
} from "firebase/auth";
import { ALLOWED_EMAIL_DOMAINS } from "../constants.js";
import { auth, isFirebaseConfigured } from "../firebase.js";
import { getAuthErrorMessage } from "../utils/authErrors.js";
import { extractGoogleAccessToken } from "../utils/googleOAuthToken.js";
import {
	clearStoredSheetsToken,
	getStoredSheetsToken,
	setStoredSheetsToken,
} from "../utils/tokenStorage.js";

const SHEETS_SCOPE = "https://www.googleapis.com/auth/spreadsheets";

const AuthContext = createContext(null);

function emailAllowed(email) {
	if (!email) return false;
	const lower = email.toLowerCase();
	return ALLOWED_EMAIL_DOMAINS.some((d) => lower.endsWith(d.toLowerCase()));
}

function googleProvider() {
	const p = new GoogleAuthProvider();
	p.addScope(SHEETS_SCOPE);
	return p;
}

export function AuthProvider({ children }) {
	const [user, setUser] = useState(null);
	const [authReady, setAuthReady] = useState(false);
	const [accessDenied, setAccessDenied] = useState(false);
	const [sheetsToken, setSheetsTokenState] = useState(() =>
		getStoredSheetsToken(),
	);
	const [authMessage, setAuthMessage] = useState(null);
	const [signInLoading, setSignInLoading] = useState(false);

	const syncTokenFromStorage = useCallback(() => {
		const t = getStoredSheetsToken();
		setSheetsTokenState(t);
		return t;
	}, []);

	const invalidateSheetsToken = useCallback(() => {
		clearStoredSheetsToken();
		setSheetsTokenState(null);
	}, []);

	/** Firebase sign-in OK + valid cached Google OAuth token for Sheets */
	const sheetsSessionReady = Boolean(sheetsToken);

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
					if (!emailAllowed(email)) {
						await signOut(auth);
						setAccessDenied(true);
					} else {
						setAccessDenied(false);
						const token = extractGoogleAccessToken(result);
						if (token) {
							setStoredSheetsToken(token);
							setSheetsTokenState(token);
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
				setUser(u);
				if (!u) {
					invalidateSheetsToken();
				} else if (!emailAllowed(u.email)) {
					setAccessDenied(true);
					signOut(auth);
					invalidateSheetsToken();
				} else {
					setAccessDenied(false);
					const t = getStoredSheetsToken();
					setSheetsTokenState(t);
				}
				setAuthReady(true);
			});
		})();

		return () => unsub();
	}, [invalidateSheetsToken]);

	const clearAuthMessage = useCallback(() => setAuthMessage(null), []);

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
			if (!emailAllowed(email)) {
				await signOut(auth);
				clearStoredSheetsToken();
				setSheetsTokenState(null);
				setAccessDenied(true);
				return;
			}
			const token = extractGoogleAccessToken(result);
			if (token) {
				setStoredSheetsToken(token);
				setSheetsTokenState(token);
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
		invalidateSheetsToken();
		await signOut(auth);
	}, [invalidateSheetsToken]);

	const connectSheetsAccess = useCallback(async () => {
		if (!auth?.currentUser) return;
		const result = await reauthenticateWithPopup(
			auth.currentUser,
			googleProvider(),
		);
		const token = extractGoogleAccessToken(result);
		if (token) {
			setStoredSheetsToken(token);
			setSheetsTokenState(token);
		} else {
			throw new Error(
				"Google did not return Sheets access. Confirm the spreadsheets scope is on your OAuth consent screen, then try again.",
			);
		}
	}, []);

	const getSheetsAccessToken = useCallback(async () => {
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
			sheetsToken,
			sheetsSessionReady,
			signInWithGoogle,
			signOutUser,
			getSheetsAccessToken,
			connectSheetsAccess,
			invalidateSheetsToken,
		}),
		[
			authReady,
			user,
			accessDenied,
			authMessage,
			clearAuthMessage,
			signInLoading,
			sheetsToken,
			sheetsSessionReady,
			signInWithGoogle,
			signOutUser,
			getSheetsAccessToken,
			connectSheetsAccess,
			invalidateSheetsToken,
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
