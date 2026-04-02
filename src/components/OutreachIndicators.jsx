import { CarFront, Mail, MessageCircle } from "lucide-react";
import {
	hasOutreach,
	isAutotraderLead,
	outreachLabel,
} from "../utils/outreach.js";

export function OutreachIndicators({ lead, compact = false }) {
	const er = lead?.emailReplied;
	const wr = lead?.whatsappReplied;
	const ar = lead?.autotraderReplied;
	const hasEmail = Boolean(String(lead?.email || "").trim());
	const hasPhone = Boolean(String(lead?.phone || "").trim());
	const isAt = isAutotraderLead(lead);
	const doneMail = hasOutreach(er);
	const doneWa = hasOutreach(wr);
	const doneAt = hasOutreach(ar);

	const title = [
		hasEmail ? `Email: ${doneMail ? outreachLabel(er) : "not logged"}` : null,
		hasPhone ? `WhatsApp: ${doneWa ? outreachLabel(wr) : "not logged"}` : null,
		isAt
			? `Autotrader: ${doneAt ? outreachLabel(ar) : "not logged"}`
			: "Autotrader: n/a",
	]
		.filter(Boolean)
		.join(" · ");

	if (!hasEmail && !hasPhone && !isAt) {
		return (
			<span className="text-slate-300" title={title}>
				—
			</span>
		);
	}

	const gap = compact ? "gap-0.5" : "gap-1";

	return (
		<div
			className={`flex items-center justify-center ${gap}`}
			title={title}
		>
			{hasEmail ? (
				<span
					className={`inline-flex rounded-md p-0.5 ${
						doneMail ? "text-sky-600" : "text-slate-300"
					}`}
					aria-label={doneMail ? "Email replied" : "Email not marked"}
				>
					<Mail className="h-4 w-4" />
				</span>
			) : (
				<span className="w-5" aria-hidden />
			)}
			{hasPhone ? (
				<span
					className={`inline-flex rounded-md p-0.5 ${
						doneWa ? "text-emerald-600" : "text-slate-300"
					}`}
					aria-label={doneWa ? "WhatsApp logged" : "WhatsApp not marked"}
				>
					<MessageCircle className="h-4 w-4" />
				</span>
			) : (
				<span className="w-5" aria-hidden />
			)}
			{isAt ? (
				<span
					className={`inline-flex rounded-md p-0.5 ${
						doneAt ? "text-violet-600" : "text-violet-300"
					}`}
					aria-label={
						doneAt ? "Autotrader replied logged" : "Autotrader not marked"
					}
				>
					<CarFront className="h-4 w-4" />
				</span>
			) : (
				<span className="w-5 text-center text-slate-200" aria-hidden>
					·
				</span>
			)}
		</div>
	);
}
