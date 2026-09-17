import type { ServerResponse } from "node:http";

/**
 * Write a JSON response. Used at the HTTP boundary so handlers stay transport-free.
 */
export function sendJson(res: ServerResponse, status: number, body: unknown): void {
	const payload = JSON.stringify(body);
	res.writeHead(status, {
		"content-type": "application/json; charset=utf-8",
		"cache-control": "no-store",
	});
	res.end(payload);
}
