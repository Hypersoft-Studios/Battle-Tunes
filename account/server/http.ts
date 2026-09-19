import { readFile, stat } from "node:fs/promises";
import {
	createServer as createHttpServer,
	type IncomingMessage,
	type Server,
	type ServerResponse,
} from "node:http";
import path from "node:path";
import { AppError } from "./app-error.js";
import { sendJson } from "./send-json.js";

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

export const createServer = (deps: AppDeps): Server =>
	createHttpServer((req, res) => {
		void handleRequest(req, res, deps);
	});

const handleRequest = async (
	req: IncomingMessage,
	res: ServerResponse,
	deps: AppDeps,
): Promise<void> => {
	try {
		const url = new URL(req.url ?? "/", "http://localhost");
		if (url.pathname.startsWith("/api/")) {
			sendJson(res, 404, { code: "NOT_FOUND", message: "Not found." });
			return;
		}
		if (req.method === "GET" || req.method === "HEAD") {
			if (await serveStatic(req, res, url.pathname, deps.staticDir)) {
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
};

const serveStatic = async (
	req: IncomingMessage,
	res: ServerResponse,
	pathname: string,
	staticDir: string | undefined,
): Promise<boolean> => {
	if (!staticDir) {
		return false;
	}
	const relative = pathname === "/" ? "/index.html" : pathname;
	const resolved = path.resolve(staticDir, `.${relative}`);
	if (!resolved.startsWith(path.resolve(staticDir))) {
		return false;
	}
	const resolvedInfo = await statIfPresent(resolved);
	if (!resolvedInfo?.isFile()) {
		const fallback = path.resolve(staticDir, "index.html");
		const fallbackInfo = await statIfPresent(fallback);
		if (!fallbackInfo?.isFile()) {
			return false;
		}
		await sendFile(req, res, fallback, ".html");
		return true;
	}
	await sendFile(req, res, resolved, path.extname(resolved));
	return true;
};

const sendFile = async (
	req: IncomingMessage,
	res: ServerResponse,
	filePath: string,
	ext: string,
): Promise<void> => {
	const type = MIME_TYPES[ext] ?? "application/octet-stream";
	res.writeHead(200, { "content-type": type });
	if (req.method === "HEAD") {
		res.end();
		return;
	}
	res.end(await readFile(filePath));
};

const statIfPresent = async (filePath: string) => {
	try {
		return await stat(filePath);
	} catch (error: unknown) {
		if (
			typeof error === "object" &&
			error !== null &&
			"code" in error &&
			error.code === "ENOENT"
		) {
			return undefined;
		}
		throw error;
	}
};
