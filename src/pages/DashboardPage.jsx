import { Download } from "lucide-react";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { BottomNav } from "../components/BottomNav.jsx";
import { ExportLeadsModal } from "../components/ExportLeadsModal.jsx";
import { GmailLeadDetail } from "../components/GmailLeadDetail.jsx";
import { LeadBoard } from "../components/LeadBoard.jsx";
import { LimitedDashboard } from "../components/LimitedDashboard.jsx";
import { PhysicalLeadModal } from "../components/PhysicalLeadModal.jsx";
import { usePermissions } from "../context/PermissionsContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { isCompanyEmail } from "../utils/accessControl.js";

export function DashboardPage() {
	const { user } = useAuth();
	const { permissions, role } = usePermissions();
	const [searchParams, setSearchParams] = useSearchParams();
	const [selectedLead, setSelectedLead] = useState(null);
	const [refreshKey, setRefreshKey] = useState(0);
	const [addPhysicalOpen, setAddPhysicalOpen] = useState(false);
	const [exportOpen, setExportOpen] = useState(false);

	const bumpRefresh = () => setRefreshKey((k) => k + 1);

	useEffect(() => {
		if (searchParams.get("add") === "1") {
			setAddPhysicalOpen(true);
			searchParams.delete("add");
			setSearchParams(searchParams, { replace: true });
		}
	}, [searchParams, setSearchParams]);

	const canPipeline = permissions.viewPipeline;
	const companyPipeline = isCompanyEmail(user?.email ?? "");

	return (
		<>
			{canPipeline ? (
				<>
					{permissions.exportData ? (
						<div className="mb-4 flex justify-end">
							<motion.button
								type="button"
								whileTap={{ scale: 0.98 }}
								onClick={() => setExportOpen(true)}
								className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-800 shadow-sm hover:border-slate-300"
							>
								<Download className="h-4 w-4" />
								Export CSV
							</motion.button>
						</div>
					) : null}
					{canPipeline && user?.email && !companyPipeline ? (
						<div
							className="mb-4 rounded-2xl border border-amber-200/90 bg-amber-50/90 px-4 py-3 text-sm text-amber-950 shadow-sm"
							role="status"
						>
							<p className="font-semibold text-amber-950">
								Gmail inbox sync is not available for this account.
							</p>
							<p className="mt-1 text-amber-900/95">
								You are signed in with a non–company email. The pipeline shows
								only leads already saved in the CRM. Company-address accounts get
								automatic Gmail label sync.
							</p>
						</div>
					) : null}
					<LeadBoard
						includeGmailInbox={companyPipeline}
						refreshKey={refreshKey}
						onSelectLead={
							permissions.viewLeadDetail
								? (l) => {
										setSelectedLead(l);
										setAddPhysicalOpen(false);
									}
								: undefined
						}
					/>
					<BottomNav
						activeTab={addPhysicalOpen ? "add" : "leads"}
						showAdd={permissions.addPhysicalLeads}
						onLeads={() => {
							setAddPhysicalOpen(false);
							setSelectedLead(null);
							window.scrollTo({ top: 0, behavior: "smooth" });
						}}
						onAddPhysical={
							permissions.addPhysicalLeads
								? () => {
										setAddPhysicalOpen(true);
										setSelectedLead(null);
									}
								: undefined
						}
					/>
					{permissions.viewLeadDetail ? (
						<GmailLeadDetail
							summary={selectedLead}
							open={Boolean(selectedLead)}
							onClose={() => setSelectedLead(null)}
							onSaved={bumpRefresh}
							readOnly={!permissions.editLeads}
						/>
					) : null}
					{permissions.addPhysicalLeads ? (
						<PhysicalLeadModal
							open={addPhysicalOpen}
							onClose={() => setAddPhysicalOpen(false)}
							onCreated={bumpRefresh}
						/>
					) : null}
				</>
			) : (
				<LimitedDashboard email={user?.email || ""} role={role} />
			)}
			{permissions.exportData ? (
				<ExportLeadsModal
					open={exportOpen}
					onClose={() => setExportOpen(false)}
				/>
			) : null}
		</>
	);
}
