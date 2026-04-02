import {
	BrowserRouter,
	Navigate,
	Outlet,
	Route,
	Routes,
	useLocation,
	useNavigate,
} from "react-router-dom";
import { AppShell } from "./components/AppShell.jsx";
import { GoogleConnectScreen } from "./components/GoogleConnectScreen.jsx";
import { LoginPage } from "./components/LoginPage.jsx";
import { AuthProvider, useAuth } from "./context/AuthContext.jsx";
import {
	PermissionsProvider,
	usePermissions,
} from "./context/PermissionsContext.jsx";
import { DashboardPage } from "./pages/DashboardPage.jsx";
import { SetPasswordPage } from "./pages/SetPasswordPage.jsx";
import { UserManagementPage } from "./pages/UserManagementPage.jsx";

function routerBasename() {
	const base = import.meta.env.BASE_URL || "/";
	if (base === "/") return undefined;
	return base.replace(/\/$/, "") || undefined;
}

function FullPageLoading() {
	return (
		<div className="flex min-h-screen items-center justify-center bg-slate-50">
			<p className="text-sm text-slate-500">Loading…</p>
		</div>
	);
}

function LoginRoute() {
	const { user, authReady } = useAuth();
	if (!authReady) return <FullPageLoading />;
	if (user) return <Navigate to="/dashboard" replace />;
	return <LoginPage />;
}

function RootRedirect() {
	const { user, authReady } = useAuth();
	if (!authReady) return <FullPageLoading />;
	if (!user) return <Navigate to="/login" replace />;
	return <Navigate to="/dashboard" replace />;
}

function RequireAuth() {
	const { user, authReady } = useAuth();
	if (!authReady) return <FullPageLoading />;
	if (!user) return <Navigate to="/login" replace />;
	return <Outlet />;
}

function GmailConnectGate() {
	const { googleAccessSessionReady } = useAuth();
	const { permissions, permissionsLoading } = usePermissions();
	const location = useLocation();

	if (permissionsLoading) return <FullPageLoading />;

	const needGmail = Boolean(permissions.gmailAccess);
	if (needGmail && !googleAccessSessionReady) {
		if (location.pathname !== "/connect-gmail") {
			return <Navigate to="/connect-gmail" replace />;
		}
	} else if (location.pathname === "/connect-gmail") {
		return <Navigate to="/dashboard" replace />;
	}

	return <Outlet />;
}

function RequireManageUsers() {
	const { permissions, permissionsLoading } = usePermissions();
	if (permissionsLoading) return <FullPageLoading />;
	if (!permissions.manageUsers) return <Navigate to="/dashboard" replace />;
	return <Outlet />;
}

function ShellLayout() {
	const { signOutUser } = useAuth();
	const { permissions } = usePermissions();
	const navigate = useNavigate();
	const location = useLocation();

	const onAddLead = permissions.addPhysicalLeads
		? () => navigate("/dashboard?add=1")
		: null;

	const title = location.pathname.startsWith("/users")
		? "Team"
		: permissions.viewPipeline
			? "Pipeline"
			: "Home";

	return (
		<AppShell
			onSignOut={signOutUser}
			onAddLead={onAddLead}
			title={title}
			showTeamLink={permissions.manageUsers}
			homeNavLabel={permissions.viewPipeline ? "Pipeline" : "Home"}
		>
			<Outlet />
		</AppShell>
	);
}

function CrmRoutes() {
	return (
		<Routes>
			<Route path="/set-password" element={<SetPasswordPage />} />
			<Route path="/login" element={<LoginRoute />} />
			<Route path="/" element={<RootRedirect />} />
			<Route element={<RequireAuth />}>
				<Route element={<GmailConnectGate />}>
					<Route path="/connect-gmail" element={<GoogleConnectScreen />} />
					<Route element={<ShellLayout />}>
						<Route path="/dashboard" element={<DashboardPage />} />
						<Route element={<RequireManageUsers />}>
							<Route
								path="/users"
								element={<UserManagementPage />}
							/>
						</Route>
					</Route>
				</Route>
			</Route>
			<Route path="*" element={<Navigate to="/dashboard" replace />} />
		</Routes>
	);
}

export default function App() {
	return (
		<BrowserRouter basename={routerBasename()}>
			<AuthProvider>
				<PermissionsProvider>
					<CrmRoutes />
				</PermissionsProvider>
			</AuthProvider>
		</BrowserRouter>
	);
}
