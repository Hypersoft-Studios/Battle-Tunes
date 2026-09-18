import { existsSync, readFileSync, statSync } from "node:fs";
import {
	createServer as createHttpServer,
	type IncomingMessage,
	type Server,
	type ServerResponse,
} from "node:http";
import path from "node:path";
import { AppError } from "./app-error";
import { sendJson } from "./send-json";

export type AppDeps = {
	staticDir?: string;
};

const MIME_TYPES: Record<string, string> = {
	".css": "text/css; charset=utf-8",
	".html": "text/html; charset=utf-8",
	".js": "text/javascript; charset=utf-8",
	".json": "application/json; charset=utf-8",
	".map": "application/json; charset=utf-8",
	".svg": "image/svg+xml",
	".txt": "text/plain; charset=utf-8",
	".woff2": "font/woff2",
};

/**
 * Tiny Node http server: static files for local/dev, JSON 404 for unknown routes.
 */
export function createServer(deps: AppDeps): Server {
	return createHttpServer((req, res) => {
		handleRequest(req, res, deps);
	});
}

function handleRequest(req: IncomingMessage, res: ServerResponse, deps: AppDeps): void {
	try {
		const url = new URL(req.url ?? "/", "http://localhost");
		if (url.pathname.startsWith("/api/")) {
			sendJson(res, 404, { code: "NOT_FOUND", message: "Not found." });
			return;
		}
		if (req.method === "GET" || req.method === "HEAD") {
			if (serveStatic(req, res, url.pathname, deps.staticDir)) {
				return;
			}
		}
		sendJson(res, 404, { code: "NOT_FOUND", message: "Not found." });
	} catch (error: unknown) {
		if (error instanceof AppError) {
			sendJson(res, error.status, { code: error.code, message: error.message });
			return;
		}
		console.error(error);
		sendJson(res, 500, { code: "INTERNAL_ERROR", message: "Something went wrong." });
	}
}

function serveStatic(
	req: IncomingMessage,
	res: ServerResponse,
	pathname: string,
	staticDir: string | undefined,
): boolean {
	if (!staticDir) {
		return false;
	}
	const relative = pathname === "/" ? "/index.html" : pathname;
	const resolved = path.resolve(staticDir, `.${relative}`);
	if (!resolved.startsWith(path.resolve(staticDir))) {
		return false;
	}
	if (!existsSync(resolved) || !statSync(resolved).isFile()) {
		const fallback = path.resolve(staticDir, "index.html");
		if (!existsSync(fallback)) {
			return false;
		}
		sendFile(req, res, fallback, ".html");
		return true;
	}
	sendFile(req, res, resolved, path.extname(resolved));
	return true;
}

function sendFile(
	req: IncomingMessage,
	res: ServerResponse,
	filePath: string,
	ext: string,
): void {
	const type = MIME_TYPES[ext] ?? "application/octet-stream";
	res.writeHead(200, { "content-type": type });
	if (req.method === "HEAD") {
		res.end();
		return;
	}
	res.end(readFileSync(filePath));
}
