import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		environment: "node",
		include: ["client/**/*.test.ts", "client/**/*.test.tsx", "server/**/*.test.ts"],
		setupFiles: ["test-setup.ts"],
	},
});
