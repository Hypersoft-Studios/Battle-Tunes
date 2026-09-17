import { existsSync, readFileSync } from "node:fs";

/**
 * Load `.env` into process.env without overwriting values already set.
 */
export function loadDotEnv(filePath = ".env"): void {
	if (!existsSync(filePath)) {
		return;
	}
	const text = readFileSync(filePath, "utf8");
	for (const line of text.split("\n")) {
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith("#")) {
			continue;
		}
		const eq = trimmed.indexOf("=");
		if (eq === -1) {
			continue;
		}
		const key = trimmed.slice(0, eq).trim();
		const value = trimmed.slice(eq + 1).trim();
		if (process.env[key] === undefined) {
			process.env[key] = value;
		}
	}
}
