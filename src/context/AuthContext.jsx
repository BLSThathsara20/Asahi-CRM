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
	onAuthStateChanged,
	reauthenticateWithPopup,
	signInWithPopup,
	signOut,
} from "firebase/auth";
import { ALLOWED_EMAIL_DOMAIN } from "../constants.js";
import { auth, isFirebaseConfigured } from "../firebase.js";
import {
	clearStoredSheetsToken,
	getStoredSheetsToken,
	setStoredSheetsToken,
} from "../utils/tokenStorage.js";

const SHEETS_SCOPE = "https://www.googleapis.com/auth/spreadsheets";

const AuthContext = createContext(null);

function emailAllowed(email) {
	if (!email) return false;
	return email.toLowerCase().endsWith(ALLOWED_EMAIL_DOMAIN.toLowerCase());
}

function googleProvider() {
	const p = new GoogleAuthProvider();
	p.addScope(SHEETS_SCOPE);
	p.setCustomParameters({ prompt: "select_account" });
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

	useEffect(() => {
		if (!auth) {
			setAuthReady(true);
			return;
		}
		const unsub = onAuthStateChanged(auth, (u) => {
			setUser(u);
			if (!u) {
				clearStoredSheetsToken();
				setSheetsTokenState(null);
			} else if (!emailAllowed(u.email)) {
				setAccessDenied(true);
				signOut(auth);
				clearStoredSheetsToken();
				setSheetsTokenState(null);
			} else {
				setAccessDenied(false);
				const t = getStoredSheetsToken();
				setSheetsTokenState(t);
			}
			setAuthReady(true);
		});
		return unsub;
	}, []);

	const signInWithGoogle = useCallback(async () => {
		if (!auth) return;
		setAccessDenied(false);
		try {
			const result = await signInWithPopup(auth, googleProvider());
			const email = result.user?.email;
			if (!emailAllowed(email)) {
				await signOut(auth);
				clearStoredSheetsToken();
				setSheetsTokenState(null);
				setAccessDenied(true);
				return;
			}
			const token = credentialAccessToken(result);
			if (token) {
				setStoredSheetsToken(token);
				setSheetsTokenState(token);
			}
		} catch (e) {
			if (e?.code === "auth/popup-closed-by-user") return;
			console.error(e);
		}
	}, []);

	const signOutUser = useCallback(async () => {
		if (!auth) return;
		clearStoredSheetsToken();
		setSheetsTokenState(null);
		await signOut(auth);
	}, []);

	const refreshSheetsToken = useCallback(async () => {
		if (!auth?.currentUser) throw new Error("Not signed in");
		const result = await reauthenticateWithPopup(
			auth.currentUser,
			googleProvider(),
		);
		const token = credentialAccessToken(result);
		if (!token) throw new Error("No Google access token");
		setStoredSheetsToken(token);
		setSheetsTokenState(token);
		return token;
	}, []);

	const getSheetsAccessToken = useCallback(async () => {
		let t = sheetsToken || getStoredSheetsToken();
		if (t) {
			setSheetsTokenState(t);
			return t;
		}
		return refreshSheetsToken();
	}, [sheetsToken, refreshSheetsToken]);

	const value = useMemo(
		() => ({
			isFirebaseConfigured,
			authReady,
			user,
			accessDenied,
			sheetsToken,
			signInWithGoogle,
			signOutUser,
			getSheetsAccessToken,
			refreshSheetsToken,
		}),
		[
			authReady,
			user,
			accessDenied,
			sheetsToken,
			signInWithGoogle,
			signOutUser,
			getSheetsAccessToken,
			refreshSheetsToken,
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
