/** Normalize Sanity client errors for UI */
export function formatSanityThrownError(err) {
	if (!err?.message) return "Could not save to Sanity.";
	const m = err.message;
	if (m === "SANITY_NOT_CONFIGURED") {
		return "Sanity is not configured. Add VITE_SANITY_PROJECT_ID, VITE_SANITY_DATASET, and VITE_SANITY_API_TOKEN to your .env file.";
	}
	if (m.includes("CORS") || m.includes("cors")) {
		return "Sanity blocked this browser origin. In sanity.io → API → CORS origins, add your app URL (e.g. http://localhost:5173).";
	}
	return m.length > 400 ? `${m.slice(0, 400)}…` : m;
}
