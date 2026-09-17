/**
 * Return a safe http(s) href, or undefined if `value` is not a public URL.
 * Used for the paid-user Battle Tunes launch link so `javascript:` cannot be inlined.
 */
export function publicHttpUrl(value: string): string | undefined {
	const trimmed = value.trim();
	if (!trimmed) {
		return undefined;
	}
	try {
		const url = new URL(trimmed);
		if (url.protocol !== "http:" && url.protocol !== "https:") {
			return undefined;
		}
		return url.href;
	} catch {
		return undefined;
	}
}
