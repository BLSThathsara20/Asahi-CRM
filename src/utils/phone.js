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
