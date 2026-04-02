function base64UrlEncodeUtf8(text) {
	const utf8Bytes = new TextEncoder().encode(text);
	let binary = "";
	for (const b of utf8Bytes) binary += String.fromCharCode(b);
	const base64 = btoa(binary);
	return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/**
 * Remove UNREAD from up to `max` messages **from** this sender (their enquiry in your inbox).
 * Needs `gmail.modify`. Best-effort: ignores failures per message.
 * @returns {{ marked: number }}
 */
export async function markUnreadFromSenderAsRead(
	accessToken,
	senderEmail,
	{ max = 25 } = {},
) {
	const from = String(senderEmail || "").trim();
	if (!from.includes("@")) return { marked: 0 };

	const q = encodeURIComponent(`from:${from} is:unread`);
	const listRes = await fetch(
		`https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${q}&maxResults=${max}`,
		{ headers: { Authorization: `Bearer ${accessToken}` } },
	);

	if (listRes.status === 401) {
		const err = new Error("UNAUTHORIZED");
		err.code = "UNAUTHORIZED";
		throw err;
	}
	if (!listRes.ok) {
		let msg = `Gmail list error ${listRes.status}`;
		try {
			const j = await listRes.json();
			if (j?.error?.message) msg = j.error.message;
		} catch {
			/* ignore */
		}
		const err = new Error(msg);
		err.status = listRes.status;
		throw err;
	}

	const data = await listRes.json();
	const messages = data.messages || [];
	let marked = 0;

	for (const m of messages) {
		if (!m?.id) continue;
		const modRes = await fetch(
			`https://gmail.googleapis.com/gmail/v1/users/me/messages/${encodeURIComponent(m.id)}/modify`,
			{
				method: "POST",
				headers: {
					Authorization: `Bearer ${accessToken}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ removeLabelIds: ["UNREAD"] }),
			},
		);
		if (modRes.ok) marked += 1;
	}

	return { marked };
}

/**
 * Send a plain-text email as the signed-in Google user (needs gmail.modify).
 * @param {string} accessToken
 * @param {{ to: string, subject: string, body: string }} opts
 */
export async function sendPlainTextEmail(accessToken, { to, subject, body }) {
	const safeTo = String(to || "").trim();
	if (!safeTo.includes("@")) {
		throw new Error("Enter a valid recipient email address.");
	}
	const subj = String(subject || "").trim() || "(no subject)";
	const rawBody = String(body ?? "")
		.replace(/\r\n/g, "\n")
		.replace(/\n/g, "\r\n");
	const raw =
		`To: ${safeTo}\r\n` +
		`Subject: ${subj}\r\n` +
		`Content-Type: text/plain; charset=UTF-8\r\n` +
		`\r\n` +
		rawBody;

	const res = await fetch(
		"https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
		{
			method: "POST",
			headers: {
				Authorization: `Bearer ${accessToken}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ raw: base64UrlEncodeUtf8(raw) }),
		},
	);

	if (res.status === 401) {
		const err = new Error("UNAUTHORIZED");
		err.code = "UNAUTHORIZED";
		throw err;
	}

	if (!res.ok) {
		let msg = `Gmail error ${res.status}`;
		try {
			const j = await res.json();
			if (j?.error?.message) msg = j.error.message;
		} catch {
			/* ignore */
		}
		const err = new Error(msg);
		err.status = res.status;
		throw err;
	}

	return res.json();
}
