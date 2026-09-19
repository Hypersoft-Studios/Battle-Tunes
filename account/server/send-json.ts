import type { ServerResponse } from "node:http";

export const sendJson = (response: ServerResponse, status: number, body: unknown): void => {
	const payload = JSON.stringify(body);
	response.writeHead(status, {
		"content-type": "application/json; charset=utf-8",
		"cache-control": "no-store",
	});
	response.end(payload);
};
