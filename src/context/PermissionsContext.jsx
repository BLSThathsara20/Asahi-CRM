import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useState,
} from "react";
import { permissionsForRole } from "../permissions/config.js";
import { resolveUserAccess } from "../utils/resolveUserAccess.js";
import { useAuth } from "./AuthContext.jsx";

const PermissionsContext = createContext(null);

export function PermissionsProvider({ children }) {
	const { user, authReady } = useAuth();
	const [loading, setLoading] = useState(true);
	const [role, setRole] = useState("guest");
	const [permissions, setPermissions] = useState(() => permissionsForRole("guest"));

	const refreshPermissions = useCallback(async () => {
		if (!user?.email) {
			setRole("guest");
			setPermissions(permissionsForRole("guest"));
			setLoading(false);
			return;
		}
		setLoading(true);
		try {
			const resolved = await resolveUserAccess(user.email);
			setRole(resolved.role);
			setPermissions(resolved.permissions);
		} catch (e) {
			console.warn("[Permissions] resolve failed:", e);
			setRole("guest");
			setPermissions(permissionsForRole("guest"));
		} finally {
			setLoading(false);
		}
	}, [user?.email]);

	useEffect(() => {
		if (!authReady) return;
		refreshPermissions();
	}, [authReady, refreshPermissions]);

	const value = useMemo(
		() => ({
			permissionsLoading: !authReady || loading,
			role,
			permissions,
			refreshPermissions,
		}),
		[authReady, loading, role, permissions, refreshPermissions],
	);

	return (
		<PermissionsContext.Provider value={value}>
			{children}
		</PermissionsContext.Provider>
	);
}

export function usePermissions() {
	const ctx = useContext(PermissionsContext);
	if (!ctx) throw new Error("usePermissions must be used within PermissionsProvider");
	return ctx;
}
