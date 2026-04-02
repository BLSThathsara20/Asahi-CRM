/** Digits only for wa.me (strip spaces, dashes, leading +) */
export function phoneToWaDigits(phone) {
	if (!phone) return "";
	const digits = String(phone).replace(/\D/g, "");
	// UK local 07... -> 447...
	if (digits.startsWith("0") && digits.length === 11) {
		return `44${digits.slice(1)}`;
	}
	if (digits.startsWith("44")) return digits;
	return digits;
}

/**
 * Open WhatsApp to a number with optional pre-filled message (truncated for URL limits).
 * @returns {string|null} wa.me URL or null if no usable digits
 */
export function waMeUrlWithText(phone, message) {
	const wa = phoneToWaDigits(phone);
	if (!wa) return null;
	const t = String(message || "").trim();
	if (!t) return `https://wa.me/${wa}`;
	const maxChars = 1200;
	const body = t.length > maxChars ? `${t.slice(0, maxChars - 1)}…` : t;
	return `https://wa.me/${wa}?text=${encodeURIComponent(body)}`;
}
