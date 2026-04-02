import { motion } from "framer-motion";
import { LOGO_URL } from "../constants.js";
import { ROLE_LABELS } from "../permissions/config.js";

export function LimitedDashboard({ email, role }) {
	const roleLabel = ROLE_LABELS[role] || role;
	return (
		<div className="mx-auto max-w-lg">
			<motion.div
				initial={{ opacity: 0, y: 8 }}
				animate={{ opacity: 1, y: 0 }}
				className="rounded-2xl border border-slate-200/90 bg-white p-8 shadow-sm"
			>
				<img src={LOGO_URL} alt="" className="mx-auto mb-6 h-12 object-contain" />
				<h2 className="text-center text-lg font-semibold text-slate-900">
					Signed in
				</h2>
				<p className="mt-1 text-center text-sm text-slate-600">{email}</p>
				<p className="mt-4 text-center text-xs font-medium uppercase tracking-wide text-slate-400">
					Access level
				</p>
				<p className="text-center text-sm font-medium text-slate-800">{roleLabel}</p>
				<p className="mt-6 text-center text-sm leading-relaxed text-slate-600">
					This role does not include the lead pipeline or CRM data. If you
					expected more access, ask an administrator to update your role
					under <strong>Team</strong>.
				</p>
			</motion.div>
		</div>
	);
}
