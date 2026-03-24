import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Must match repo name: https://blsthathsara20.github.io/Asahi-CRM/
const GH_PAGES_BASE = "/Asahi-CRM/";

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
	plugins: [react()],
	base: command === "build" ? GH_PAGES_BASE : "/",
}));
