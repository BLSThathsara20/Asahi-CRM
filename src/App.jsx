import { useState } from "react";
import { AddLeadModal } from "./components/AddLeadModal.jsx";
import { AppShell } from "./components/AppShell.jsx";
import { BottomNav } from "./components/BottomNav.jsx";
import { LeadBoard } from "./components/LeadBoard.jsx";
import { LeadDetailPanel } from "./components/LeadDetailPanel.jsx";
import { LoginPage } from "./components/LoginPage.jsx";
import { AuthProvider, useAuth } from "./context/AuthContext.jsx";

function CrmApp() {
	const { user, authReady, signOutUser } = useAuth();
	const [selectedLead, setSelectedLead] = useState(null);
	const [addOpen, setAddOpen] = useState(false);
	const [refreshKey, setRefreshKey] = useState(0);

	const bumpRefresh = () => setRefreshKey((k) => k + 1);

	if (!authReady) {
		return (
			<div className="flex min-h-screen items-center justify-center bg-slate-50">
				<p className="text-sm text-slate-500">Loading…</p>
			</div>
		);
	}

	if (!user) {
		return <LoginPage />;
	}

	return (
		<>
			<AppShell
				onSignOut={signOutUser}
				onAddLead={() => {
					setAddOpen(true);
					setSelectedLead(null);
				}}
			>
				<LeadBoard
					refreshKey={refreshKey}
					onSelectLead={(l) => {
						setSelectedLead(l);
						setAddOpen(false);
					}}
				/>
			</AppShell>
			<BottomNav
				active={addOpen ? "add" : "leads"}
				onLeads={() => {
					setAddOpen(false);
					setSelectedLead(null);
					window.scrollTo({ top: 0, behavior: "smooth" });
				}}
				onAdd={() => {
					setAddOpen(true);
					setSelectedLead(null);
				}}
			/>
			<LeadDetailPanel
				lead={selectedLead}
				open={Boolean(selectedLead)}
				onClose={() => setSelectedLead(null)}
				onSaved={bumpRefresh}
			/>
			<AddLeadModal
				open={addOpen}
				onClose={() => setAddOpen(false)}
				onSaved={bumpRefresh}
			/>
		</>
	);
}

export default function App() {
	return (
		<AuthProvider>
			<CrmApp />
		</AuthProvider>
	);
}
