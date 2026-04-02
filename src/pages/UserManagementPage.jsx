import { motion } from "framer-motion";
import { Copy, Link2, Loader2, Save, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
	CRM_ROLE_KEYS,
	PERMISSION_LABELS,
	ROLE_LABELS,
	permissionsForRole,
} from "../permissions/config.js";
import {
	buildPasswordSetupPublicUrl,
	deleteCrmUserById,
	issuePasswordSetupToken,
	listCrmUsers,
	upsertCrmUser,
} from "../services/sanityCrmUsersApi.js";
import { isSanityConfigured } from "../services/sanityLeadsApi.js";
import { formatSanityThrownError } from "../utils/sanityErrors.js";
import { usePermissions } from "../context/PermissionsContext.jsx";

const PERM_KEYS = Object.keys(PERMISSION_LABELS);

function emptyOverrides() {
	return PERM_KEYS.reduce((acc, k) => {
		acc[k] = undefined;
		return acc;
	}, {});
}

function describePasswordSetupLink(row) {
	if (!row?.passwordSetupExpiresAt && !row?.passwordSetupUsedAt) {
		return "No setup link issued yet. Generate a link and send it to the user; it expires in 7 days.";
	}
	if (row.passwordSetupUsedAt) {
		return "The last link was already used. Generate a new link if they need to set a password on a fresh Firebase login.";
	}
	const exp = new Date(row.passwordSetupExpiresAt).getTime();
	if (Number.isFinite(exp) && exp <= Date.now()) {
		return "The last link has expired. Use Create / Regenerate to issue a new one.";
	}
	return `A link may still be valid until ${new Date(row.passwordSetupExpiresAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}. Regenerate to replace it.`;
}

export function UserManagementPage() {
	const { refreshPermissions, role: myRole } = usePermissions();
	const [rows, setRows] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [saving, setSaving] = useState(false);

	const [email, setEmail] = useState("");
	const [displayName, setDisplayName] = useState("");
	const [role, setRole] = useState("user");
	const [overrides, setOverrides] = useState(emptyOverrides);
	const [editingId, setEditingId] = useState(null);
	const [lastIssuedSetupUrl, setLastIssuedSetupUrl] = useState(null);
	const [linkBusy, setLinkBusy] = useState(false);

	const load = useCallback(async () => {
		if (!isSanityConfigured()) {
			setRows([]);
			setLoading(false);
			return;
		}
		setLoading(true);
		setError(null);
		try {
			const data = await listCrmUsers();
			setRows(data || []);
		} catch (e) {
			setError(formatSanityThrownError(e));
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		load();
	}, [load]);

	function selectRow(r) {
		setEditingId(r._id);
		setLastIssuedSetupUrl(null);
		setEmail(r.email || "");
		setDisplayName(r.displayName || "");
		setRole(r.role || "user");
		const next = emptyOverrides();
		const po = r.permissionOverrides || {};
		for (const k of PERM_KEYS) {
			if (po[k] !== undefined) next[k] = po[k];
		}
		setOverrides(next);
	}

	function newUser() {
		setEditingId(null);
		setLastIssuedSetupUrl(null);
		setEmail("");
		setDisplayName("");
		setRole("user");
		setOverrides(emptyOverrides());
	}

	async function handleSave(e) {
		e.preventDefault();
		const em = String(email || "").trim().toLowerCase();
		if (!em || !em.includes("@")) {
			setError("Enter a valid email.");
			return;
		}
		setSaving(true);
		setError(null);
		try {
			const po = {};
			const defaults = permissionsForRole(role);
			for (const k of PERM_KEYS) {
				const o = overrides[k];
				if (o !== undefined && Boolean(o) !== Boolean(defaults[k])) {
					po[k] = Boolean(o);
				}
			}
			await upsertCrmUser({
				email: em,
				displayName: displayName.trim(),
				role,
				permissionOverrides: po,
			});
			await load();
			await refreshPermissions();
			newUser();
		} catch (err) {
			setError(formatSanityThrownError(err));
		} finally {
			setSaving(false);
		}
	}

	const selectedRow = rows.find((r) => r._id === editingId);

	async function handleIssuePasswordSetupLink() {
		if (!editingId || myRole !== "superadmin") return;
		setLinkBusy(true);
		setError(null);
		try {
			const { passwordSetupToken } = await issuePasswordSetupToken(editingId);
			setLastIssuedSetupUrl(buildPasswordSetupPublicUrl(passwordSetupToken));
			await load();
		} catch (err) {
			setError(formatSanityThrownError(err));
		} finally {
			setLinkBusy(false);
		}
	}

	async function handleDelete() {
		if (!editingId) return;
		if (!window.confirm("Remove this CRM user record?")) return;
		setSaving(true);
		setError(null);
		try {
			await deleteCrmUserById(editingId);
			await load();
			await refreshPermissions();
			newUser();
		} catch (err) {
			setError(formatSanityThrownError(err));
		} finally {
			setSaving(false);
		}
	}

	if (!isSanityConfigured()) {
		return (
			<p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-950 ring-1 ring-amber-200/80">
				Configure Sanity in <code className="text-xs">.env</code> to manage
				users.
			</p>
		);
	}

	return (
		<div className="flex flex-col gap-6 lg:flex-row">
			<div className="lg:w-[320px]">
				<div className="mb-3 flex items-center justify-between">
					<h2 className="text-sm font-semibold text-slate-800">CRM users</h2>
					<button
						type="button"
						onClick={() => newUser()}
						className="text-xs font-medium text-sky-700 hover:underline"
					>
						New
					</button>
				</div>
				<div className="max-h-[min(70vh,520px)] space-y-1 overflow-y-auto rounded-2xl border border-slate-200/90 bg-white p-2 shadow-sm">
					{loading ? (
						<p className="py-8 text-center text-sm text-slate-500">
							<Loader2 className="mx-auto mb-2 h-6 w-6 animate-spin" />
							Loading…
						</p>
					) : rows.length === 0 ? (
						<p className="px-2 py-6 text-center text-sm text-slate-500">
							No users yet. Add emails here so people can sign in with
							Google (after you deploy the schema). Use{" "}
							<code className="text-xs">VITE_SUPERADMIN_EMAILS</code> to
							bootstrap the first admin.
						</p>
					) : (
						rows.map((r) => (
							<button
								key={r._id}
								type="button"
								onClick={() => selectRow(r)}
								className={`w-full rounded-xl px-3 py-2.5 text-left text-sm transition-colors ${
									editingId === r._id
										? "bg-slate-900 text-white"
										: "bg-slate-50 text-slate-800 hover:bg-slate-100"
								}`}
							>
								<p className="truncate font-medium">{r.email}</p>
								<p
									className={`truncate text-xs ${editingId === r._id ? "text-slate-300" : "text-slate-500"}`}
								>
									{ROLE_LABELS[r.role] || r.role}
									{r.lastLoginAt
										? ` · Last login ${new Date(r.lastLoginAt).toLocaleString(undefined, {
												dateStyle: "short",
												timeStyle: "short",
											})}`
										: ""}
								</p>
							</button>
						))
					)}
				</div>
			</div>

			<motion.form
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				onSubmit={handleSave}
				className="min-w-0 flex-1 rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm"
			>
				<h2 className="text-base font-semibold text-slate-900">
					{editingId ? "Edit user" : "Add user"}
				</h2>
				<p className="mt-1 text-xs text-slate-500">
					Overrides apply on top of the role preset; unticked = use role default.
				</p>

				<div className="mt-4 grid gap-3 sm:grid-cols-2">
					<div className="sm:col-span-2">
						<label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
							Email
						</label>
						<input
							required
							type="email"
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							disabled={Boolean(editingId)}
							className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm disabled:bg-slate-50"
						/>
					</div>
					<div className="sm:col-span-2">
						<label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
							Display name
						</label>
						<input
							value={displayName}
							onChange={(e) => setDisplayName(e.target.value)}
							className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
						/>
					</div>
					<div className="sm:col-span-2">
						<label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
							Role
						</label>
						<select
							value={role}
							onChange={(e) => {
								setRole(e.target.value);
								setOverrides(emptyOverrides());
							}}
							className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
						>
							{CRM_ROLE_KEYS.filter((k) => k !== "guest").map((k) => (
								<option key={k} value={k}>
									{ROLE_LABELS[k] || k}
								</option>
							))}
						</select>
					</div>
				</div>

				<div className="mt-5">
					<p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
						Permission overrides
					</p>
					<div className="grid gap-2 sm:grid-cols-2">
						{PERM_KEYS.map((k) => {
							const def = permissionsForRole(role)[k];
							const val = overrides[k];
							const checked = val !== undefined ? Boolean(val) : Boolean(def);
							return (
								<label
									key={k}
									className="flex cursor-pointer items-start gap-2 rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2 text-sm"
								>
									<input
										type="checkbox"
										checked={checked}
										onChange={(e) => {
											const next = e.target.checked;
											setOverrides((o) => {
												const n = { ...o };
												if (next === def) delete n[k];
												else n[k] = next;
												return n;
											});
										}}
										className="mt-0.5 rounded border-slate-300"
									/>
									<span>
										<span className="font-medium text-slate-800">
											{PERMISSION_LABELS[k]}
										</span>
										<span className="mt-0.5 block text-xs text-slate-500">
											Role default: {def ? "on" : "off"}
										</span>
									</span>
								</label>
							);
						})}
					</div>
				</div>

				{myRole === "superadmin" && editingId ? (
					<div className="mt-5 rounded-2xl border border-sky-200/80 bg-sky-50/80 p-4">
						<p className="text-xs font-semibold uppercase tracking-wide text-sky-900">
							Password setup (magic link)
						</p>
						<p className="mt-1.5 text-xs leading-relaxed text-sky-950/90">
							{describePasswordSetupLink(selectedRow)}
						</p>
						<p className="mt-2 text-[0.65rem] text-sky-900/80">
							User must exist in <strong>Team</strong> first. They open the link
							once to set a Firebase password; the link then expires. Add the same
							email in Firebase Auth if you rely on email/password sign-in.
						</p>
						<button
							type="button"
							disabled={linkBusy}
							onClick={() => void handleIssuePasswordSetupLink()}
							className="mt-3 inline-flex items-center gap-2 rounded-xl bg-sky-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-sky-800 disabled:opacity-60"
						>
							{linkBusy ? (
								<Loader2 className="h-4 w-4 animate-spin" />
							) : (
								<Link2 className="h-4 w-4" />
							)}
							{selectedRow?.passwordSetupExpiresAt &&
							!selectedRow?.passwordSetupUsedAt &&
							new Date(selectedRow.passwordSetupExpiresAt).getTime() > Date.now()
								? "Regenerate setup link"
								: "Create password setup link"}
						</button>
						{lastIssuedSetupUrl ? (
							<div className="mt-3 space-y-2">
								<label className="block text-[0.65rem] font-medium text-sky-900">
									Link to send (copy now — it won’t be shown again)
								</label>
								<div className="flex gap-2">
									<input
										readOnly
										value={lastIssuedSetupUrl}
										className="min-w-0 flex-1 rounded-lg border border-sky-200 bg-white px-2 py-1.5 text-xs text-slate-800"
									/>
									<button
										type="button"
										onClick={() =>
											void navigator.clipboard.writeText(lastIssuedSetupUrl)
										}
										className="shrink-0 rounded-lg border border-sky-200 bg-white px-3 py-1.5 text-sky-800 hover:bg-sky-100"
										title="Copy"
									>
										<Copy className="h-4 w-4" />
									</button>
								</div>
							</div>
						) : null}
					</div>
				) : null}

				{error ? (
					<p className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800 ring-1 ring-rose-200/80">
						{error}
					</p>
				) : null}

				<div className="mt-6 flex flex-wrap gap-2">
					<button
						type="submit"
						disabled={saving}
						className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60 sm:flex-initial"
					>
						{saving ? (
							<Loader2 className="h-4 w-4 animate-spin" />
						) : (
							<Save className="h-4 w-4" />
						)}
						Save user
					</button>
					{editingId ? (
						<button
							type="button"
							onClick={() => handleDelete()}
							disabled={saving}
							className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-medium text-rose-900 hover:bg-rose-100/80 disabled:opacity-60"
						>
							<Trash2 className="h-4 w-4" />
							Delete
						</button>
					) : null}
				</div>
			</motion.form>
		</div>
	);
}
