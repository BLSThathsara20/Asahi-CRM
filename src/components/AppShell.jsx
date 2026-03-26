import { motion } from "framer-motion";
import { ArrowLeft, LogOut, Plus, Users } from "lucide-react";
import { LOGO_URL } from "../constants.js";

export function AppShell({
	children,
	onSignOut,
	onAddLead,
	onManageAccess,
	onBack,
	title = "Leads",
}) {
	return (
		<div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50 text-slate-900">
			<header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur-md">
				<div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
					<div className="flex min-w-0 items-center gap-3">
						{onBack && (
							<button
								type="button"
								onClick={onBack}
								className="shrink-0 rounded-xl border border-slate-200 bg-white p-2 text-slate-600 shadow-sm transition-colors hover:border-slate-300 hover:text-slate-900"
								title="Back"
							>
								<ArrowLeft className="h-5 w-5" />
							</button>
						)}
						<img
							src={LOGO_URL}
							alt=""
							className="h-9 w-auto shrink-0 object-contain"
						/>
						<div className="min-w-0">
							<h1 className="truncate text-lg font-semibold tracking-tight sm:text-xl">
								{title}
							</h1>
							<p className="hidden text-xs text-slate-500 sm:block">
								Asahi Motors CRM
							</p>
						</div>
					</div>
					<div className="flex shrink-0 items-center gap-2">
						{onAddLead && (
							<motion.button
								type="button"
								whileTap={{ scale: 0.98 }}
								onClick={onAddLead}
								className="hidden items-center gap-1.5 rounded-xl bg-slate-900 px-3 py-2 text-sm font-medium text-white shadow-md shadow-slate-900/15 sm:inline-flex"
							>
								<Plus className="h-4 w-4" />
								Add lead
							</motion.button>
						)}
						{onManageAccess && (
							<button
								type="button"
								onClick={onManageAccess}
								className="rounded-xl border border-slate-200 bg-white p-2 text-slate-600 shadow-sm transition-colors hover:border-slate-300 hover:text-slate-900"
								title="Manage access"
							>
								<Users className="h-5 w-5" />
							</button>
						)}
						<button
							type="button"
							onClick={onSignOut}
							className="rounded-xl border border-slate-200 bg-white p-2 text-slate-600 shadow-sm transition-colors hover:border-slate-300 hover:text-slate-900"
							title="Sign out"
						>
							<LogOut className="h-5 w-5" />
						</button>
					</div>
				</div>
			</header>
			<main className="mx-auto max-w-6xl px-4 py-5 sm:px-6 sm:py-8 md:pb-10">
				{children}
			</main>
		</div>
	);
}
