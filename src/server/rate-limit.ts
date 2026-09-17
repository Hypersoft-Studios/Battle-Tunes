import type { RateLimiter } from "./ports.ts";

/**
 * In-memory sliding-window limiter for the single Node process.
 */
export class MemoryRateLimiter implements RateLimiter {
	private readonly hits = new Map<string, number[]>();

	constructor(
		private readonly maxHits: number,
		private readonly windowMs: number,
		private readonly now: () => number = Date.now,
	) {}

	allow(key: string): boolean {
		const now = this.now();
		const cutoff = now - this.windowMs;
		const recent = (this.hits.get(key) ?? []).filter((time) => time > cutoff);
		if (recent.length >= this.maxHits) {
			this.hits.set(key, recent);
			return false;
		}
		recent.push(now);
		this.hits.set(key, recent);
		return true;
	}
}
