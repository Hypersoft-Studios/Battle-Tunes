import type { IncomingMessage } from "node:http";
import { AppError } from "./app-error.ts";

/**
 * Parse a JSON request body with a hard size cap so oversized payloads cannot fill memory.
 */
export async function readJsonBody(req: IncomingMessage, maxBytes = 32_768): Promise<unknown> {
	const chunks: Buffer[] = [];
	let size = 0;
	for await (const chunk of req) {
		const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
		size += buf.length;
		if (size > maxBytes) {
			throw new AppError("VALIDATION_ERROR", 400, "Request is too large.");
		}
		chunks.push(buf);
	}
	if (size === 0) {
		return {};
	}
	try {
		return JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;
	} catch {
		throw new AppError("VALIDATION_ERROR", 400, "Invalid JSON.");
	}
}

/**
 * Read `Authorization: Bearer` so checkout/reconcile can load the Clerk user server-side.
 */
export function readBearerToken(header: string | undefined): string | undefined {
	if (!header) {
		return undefined;
	}
	const match = /^Bearer\s+(\S+)$/i.exec(header.trim());
	return match?.[1];
}

/** Caller key for contact rate limiting (forwarded IP, then socket). */
export function clientKey(req: IncomingMessage): string {
	const forwarded = req.headers["x-forwarded-for"];
	if (typeof forwarded === "string" && forwarded.length > 0) {
		const first = forwarded.split(",")[0]?.trim();
		if (first) {
			return first;
		}
	}
	return req.socket.remoteAddress ?? "unknown";
}

/** True when `value` is a plain object, used to read JSON bodies without a validator library. */
export function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}
