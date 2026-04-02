import { DEALERSHIP_SIGN_OFF } from "../constants.js";

/**
 * Remove closing sign-off so “Open in Gmail” opens a shorter message; user
 * can paste signature from their Gmail settings instead.
 */
export function stripEmailSignOffForCompose(body) {
	const t = String(body || "").replace(/\r\n/g, "\n");
	const normalizedSig = DEALERSHIP_SIGN_OFF.replace(/\r\n/g, "\n").trim();
	const idx = t.lastIndexOf(normalizedSig);
	if (idx !== -1) {
		return t.slice(0, idx).replace(/\s+$/u, "");
	}
	const flex = /\n+Kind regards,?\s*\n+\s*Asahi Motors Team\s*$/im;
	const m = t.match(flex);
	if (m && m.index != null) {
		return t.slice(0, m.index).replace(/\s+$/u, "");
	}
	const short = /\n+Kind regards,?\s*$/im;
	const m2 = t.match(short);
	if (m2 && m2.index != null) {
		return t.slice(0, m2.index).replace(/\s+$/u, "");
	}
	return t.trimEnd();
}

/**
 * Gmail web compose: to, subject (su), body. Long bodies may hit URL limits.
 */
export function buildGmailComposeUrl(to, subject, body) {
	const cleanTo = String(to || "").trim();
	if (!cleanTo) return null;
	const su = encodeURIComponent(String(subject || "").trim());
	let plain = stripEmailSignOffForCompose(body);
	const base = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(cleanTo)}&su=${su}&body=`;
	let encBody = encodeURIComponent(plain);
	const maxTotal = 2000;
	if (base.length + encBody.length > maxTotal && plain.length > 200) {
		plain = `${plain.slice(0, Math.max(100, maxTotal - base.length - 20))}…`;
		encBody = encodeURIComponent(plain);
	}
	return `${base}${encBody}`;
}
