import { motion } from "framer-motion";
import { LayoutGrid, UserPlus } from "lucide-react";

export function BottomNav({
	onLeads,
	onAddPhysical,
	activeTab = "leads",
	showAdd = true,
}) {
	const pipelineLabel = showAdd ? "Pipeline" : "Home";

	return (
		<nav
			className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200/90 bg-white/95 pb-[env(safe-area-inset-bottom)] pt-1 shadow-[0_-4px_24px_rgba(15,23,42,0.06)] backdrop-blur-md md:hidden"
			aria-label="Main"
		>
			<div
				className={`mx-auto flex max-w-lg items-stretch px-2 ${showAdd ? "justify-around" : "justify-center"}`}
			>
				<button
					type="button"
					onClick={onLeads}
					className={`flex flex-col items-center gap-0.5 py-2.5 text-xs font-medium transition-colors ${
						showAdd ? "flex-1" : ""
					} ${
						activeTab === "leads"
							? "text-slate-900"
							: "text-slate-400 hover:text-slate-600"
					}`}
				>
					<LayoutGrid
						className="h-6 w-6"
						strokeWidth={activeTab === "leads" ? 2.25 : 2}
					/>
					{pipelineLabel}
					{activeTab === "leads" ? (
						<motion.span
							layoutId="nav-indicator"
							className="h-0.5 w-8 rounded-full bg-slate-900"
						/>
					) : (
						<span className="h-0.5 w-8" />
					)}
				</button>
				{showAdd ? (
					<button
						type="button"
						onClick={onAddPhysical}
						className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-xs font-medium transition-colors ${
							activeTab === "add"
								? "text-slate-900"
								: "text-slate-400 hover:text-slate-600"
						}`}
					>
						<span
							className={`flex h-10 w-10 items-center justify-center rounded-2xl shadow-md transition-colors ${
								activeTab === "add"
									? "bg-slate-900 text-white"
									: "bg-slate-100 text-slate-700"
							}`}
						>
							<UserPlus className="h-5 w-5" strokeWidth={2.25} />
						</span>
						Add lead
						{activeTab === "add" ? (
							<motion.span
								layoutId="nav-indicator"
								className="h-0.5 w-8 rounded-full bg-slate-900"
							/>
						) : (
							<span className="h-0.5 w-8" />
						)}
					</button>
				) : null}
			</div>
		</nav>
	);
}
