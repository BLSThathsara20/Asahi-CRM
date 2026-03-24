import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// GitHub Pages project URL: https://<user>.github.io/<repo>/
// Change "asahi-crm" if your repository name differs.
const GH_PAGES_BASE = "/asahi-crm/";

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
	plugins: [react()],
	base: command === "build" ? GH_PAGES_BASE : "/",
}));
