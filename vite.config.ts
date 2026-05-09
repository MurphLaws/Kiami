import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import * as dotenv from "dotenv";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";

// Load .env.local (TanStack Start/Vite convention)
dotenv.config({ path: ".env.local", quiet: true });
// Also load .env as fallback
dotenv.config({ quiet: true });

export default defineConfig({
	plugins: [tanstackStart(), nitro(), viteReact()],
	resolve: {
		tsconfigPaths: true,
	},
});
