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
	reauthenticateWithRedirect,
	signInWithRedirect,
	signOut,
} from "firebase/auth";
import { ALLOWED_EMAIL_DOMAINS } from "../constants.js";
import { auth, isFirebaseConfigured } from "../firebase.js";
import { getAuthErrorMessage } from "../utils/authErrors.js";
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

function credentialAccessToken(result) {
	const cred = GoogleAuthProvider.credentialFromResult(result);
	return cred?.accessToken ?? null;
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

	const invalidateSheetsToken = useCallback(() => {
		clearStoredSheetsToken();
		setSheetsTokenState(null);
	}, []);

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
						const token = credentialAccessToken(result);
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
			await signInWithRedirect(auth, googleProvider());
		} catch (e) {
			const code = e?.code;
			const msg = getAuthErrorMessage(code, e?.message);
			setAuthMessage({
				type: "error",
				message: msg,
			});
			console.error(e);
			setSignInLoading(false);
		}
	}, []);

	const signOutUser = useCallback(async () => {
		if (!auth) return;
		invalidateSheetsToken();
		await signOut(auth);
	}, [invalidateSheetsToken]);

	/**
	 * Opens Google in the same tab (redirect). After you return, Sheets access is refreshed.
	 * Use instead of popups — avoids Cross-Origin-Opener-Policy issues on GitHub Pages.
	 */
	const connectSheetsAccess = useCallback(async () => {
		if (!auth?.currentUser) return;
		await reauthenticateWithRedirect(auth.currentUser, googleProvider());
	}, []);

	/** Returns cached OAuth token only — never opens a popup automatically. */
	const getSheetsAccessToken = useCallback(async () => {
		const t = sheetsToken || getStoredSheetsToken();
		if (t) {
			setSheetsTokenState(t);
			return t;
		}
		return null;
	}, [sheetsToken]);

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
