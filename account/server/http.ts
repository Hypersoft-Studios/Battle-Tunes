import { readFile, stat as getFileStatus } from "node:fs/promises";
import {
	createServer as createHttpServer,
	type IncomingMessage,
	type Server,
	type ServerResponse,
} from "node:http";
import path from "node:path";
import { AppError } from "./app-error.js";
import { sendJson } from "./send-json.js";

export type AppDependencies = {
	staticDirectory?: string;
};

const CONTENT_TYPE_BY_EXTENSION: Record<string, string> = {
	".css": "text/css; charset=utf-8",
	".html": "text/html; charset=utf-8",
	".js": "text/javascript; charset=utf-8",
	".json": "application/json; charset=utf-8",
	".map": "application/json; charset=utf-8",
	".svg": "image/svg+xml",
	".txt": "text/plain; charset=utf-8",
	".woff2": "font/woff2",
};

export const createServer = (dependencies: AppDependencies): Server =>
	createHttpServer((request, response) => {
		void handleRequest(request, response, dependencies);
	});

const handleRequest = async (
	request: IncomingMessage,
	response: ServerResponse,
	dependencies: AppDependencies,
): Promise<void> => {
	try {
		const requestUrl = new URL(request.url ?? "/", "http://localhost");
		if (requestUrl.pathname.startsWith("/api/")) {
			sendJson(response, 404, { code: "NOT_FOUND", message: "Not found." });
			return;
		}
		if (request.method === "GET" || request.method === "HEAD") {
			if (await serveStatic(request, response, requestUrl.pathname, dependencies.staticDirectory)) {
				return;
			}
		}
		sendJson(response, 404, { code: "NOT_FOUND", message: "Not found." });
	} catch (error: unknown) {
		if (error instanceof AppError) {
			sendJson(response, error.status, { code: error.code, message: error.message });
			return;
		}
		console.error(error);
		sendJson(response, 500, { code: "INTERNAL_ERROR", message: "Something went wrong." });
	}
};

const serveStatic = async (
	request: IncomingMessage,
	response: ServerResponse,
	pathname: string,
	staticDirectory: string | undefined,
): Promise<boolean> => {
	if (!staticDirectory) {
		return false;
	}
	const relativePath = pathname === "/" ? "/index.html" : pathname;
	const resolvedPath = path.resolve(staticDirectory, `.${relativePath}`);
	if (!resolvedPath.startsWith(path.resolve(staticDirectory))) {
		return false;
	}
	const resolvedFileStatus = await fileStatusIfPresent(resolvedPath);
	if (!resolvedFileStatus?.isFile()) {
		const fallbackPath = path.resolve(staticDirectory, "index.html");
		const fallbackFileStatus = await fileStatusIfPresent(fallbackPath);
		if (!fallbackFileStatus?.isFile()) {
			return false;
		}
		await sendFile(request, response, fallbackPath, ".html");
		return true;
	}
	await sendFile(request, response, resolvedPath, path.extname(resolvedPath));
	return true;
};

const sendFile = async (
	request: IncomingMessage,
	response: ServerResponse,
	filePath: string,
	extension: string,
): Promise<void> => {
	const contentType = CONTENT_TYPE_BY_EXTENSION[extension] ?? "application/octet-stream";
	response.writeHead(200, { "content-type": contentType });
	if (request.method === "HEAD") {
		response.end();
		return;
	}
	response.end(await readFile(filePath));
};

const fileStatusIfPresent = async (filePath: string) => {
	try {
		return await getFileStatus(filePath);
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
