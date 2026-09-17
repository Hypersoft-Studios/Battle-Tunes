import { randomUUID } from "node:crypto";
import { createReadStream, existsSync, statSync } from "node:fs";
import {
	createServer as createHttpServer,
	type IncomingMessage,
	type Server,
	type ServerResponse,
} from "node:http";
import path from "node:path";
import { AppError } from "./app-error.ts";
import { handleCheckout } from "./checkout.ts";
import { handleContact } from "./contact.ts";
import type { AppDeps } from "./ports.ts";
import { handleReconcile } from "./reconcile.ts";
import { clientKey, isRecord, readBearerToken, readJsonBody } from "./request.ts";
import { sendJson } from "./send-json.ts";

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
 * Tiny Node http server: three POST /api routes plus optional static files for local/dev.
 */
export function createServer(deps: AppDeps): Server {
	return createHttpServer((req, res) => {
		void handleRequest(req, res, deps);
	});
}

async function handleRequest(
	req: IncomingMessage,
	res: ServerResponse,
	deps: AppDeps,
): Promise<void> {
	const requestId = randomUUID();
	const started = Date.now();
	try {
		const url = new URL(req.url ?? "/", "http://localhost");
		if (url.pathname.startsWith("/api/")) {
			await handleApi(req, res, url.pathname, deps, requestId);
			deps.logger.info("[http.api] Done", {
				requestId,
				method: req.method,
				path: url.pathname,
				status: res.statusCode,
				durationMs: Date.now() - started,
			});
			return;
		}
		if (req.method === "GET" || req.method === "HEAD") {
			if (serveStatic(req, res, url.pathname, deps.staticDir)) {
				return;
			}
		}
		sendJson(res, 404, { code: "NOT_FOUND", message: "Not found." });
	} catch (error) {
		if (error instanceof AppError) {
			sendJson(res, error.status, { code: error.code, message: error.message });
			return;
		}
		deps.logger.error("[http] Unhandled", {
			requestId,
			error:
				error instanceof Error
					? { message: error.message, stack: error.stack }
					: { message: "unknown" },
		});
		sendJson(res, 500, { code: "INTERNAL_ERROR", message: "Something went wrong." });
	}
}

async function handleApi(
	req: IncomingMessage,
	res: ServerResponse,
	pathname: string,
	deps: AppDeps,
	requestId: string,
): Promise<void> {
	if (req.method !== "POST") {
		sendJson(res, 404, { code: "NOT_FOUND", message: "Not found." });
		return;
	}

	const token = readBearerToken(headerValue(req.headers.authorization));

	if (pathname === "/api/checkout") {
		const result = await handleCheckout({ sessionToken: token }, deps);
		sendJson(res, 200, result);
		return;
	}

	if (pathname === "/api/reconcile") {
		const body = await readJsonBody(req);
		const sessionId = isRecord(body) ? body.sessionId : undefined;
		const result = await handleReconcile({ sessionToken: token, sessionId }, deps);
		sendJson(res, 200, result);
		return;
	}

	if (pathname === "/api/contact") {
		const body = await readJsonBody(req);
		const email = isRecord(body) ? body.email : undefined;
		const subject = isRecord(body) ? body.subject : undefined;
		const message = isRecord(body) ? body.message : undefined;
		const result = await handleContact(
			{ email, subject, message, clientKey: clientKey(req) },
			deps,
		);
		deps.logger.info("[http.contact] Accepted", { requestId });
		sendJson(res, 200, result);
		return;
	}

	sendJson(res, 404, { code: "NOT_FOUND", message: "Not found." });
}

function headerValue(value: string | string[] | undefined): string | undefined {
	if (Array.isArray(value)) {
		return value[0];
	}
	return value;
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
		streamFile(req, res, fallback, ".html");
		return true;
	}
	streamFile(req, res, resolved, path.extname(resolved));
	return true;
}

function streamFile(
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
	createReadStream(filePath).pipe(res);
}
