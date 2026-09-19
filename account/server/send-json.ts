import type { ServerResponse } from "node:http";

export const sendJson = (res: ServerResponse, status: number, body: unknown): void => {
	const payload = JSON.stringify(body);
	res.writeHead(status, {
		"content-type": "application/json; charset=utf-8",
		"cache-control": "no-store",
	});
	res.end(payload);
};
