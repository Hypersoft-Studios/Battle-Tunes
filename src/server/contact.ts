import { AppError } from "./app-error.ts";
import type { Logger } from "./logger.ts";
import type { MailPort, RateLimiter } from "./ports.ts";

export type ContactDeps = {
	mail: MailPort;
	rateLimiter: RateLimiter;
	logger: Logger;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Send a support message through Resend. Nothing is persisted locally.
 *
 * @param request - email, subject (1–120), message (1–5000), and a caller key for rate limiting
 * @throws {AppError} VALIDATION_ERROR | RATE_LIMITED | EMAIL_ERROR
 */
export async function handleContact(
	request: {
		email: unknown;
		subject: unknown;
		message: unknown;
		clientKey: string;
	},
	deps: ContactDeps,
): Promise<{ sent: true }> {
	const email = readBoundedString(request.email, 1, 254);
	const subject = readBoundedString(request.subject, 1, 120);
	const message = readBoundedString(request.message, 1, 5000);
	if (!email || !EMAIL_PATTERN.test(email) || !subject || !message) {
		throw new AppError("VALIDATION_ERROR", 400, "Invalid request.");
	}

	if (!deps.rateLimiter.allow(request.clientKey)) {
		throw new AppError("RATE_LIMITED", 429, "Please wait before sending another message.");
	}

	try {
		await deps.mail.sendContact({ replyTo: email, subject, text: message });
	} catch (error) {
		deps.logger.error("[contact.send] Failed", {
			error: error instanceof Error ? error.message : "unknown",
		});
		throw new AppError("EMAIL_ERROR", 502, "Could not send the message.");
	}

	deps.logger.info("[contact.send] Sent");
	return { sent: true };
}

function readBoundedString(value: unknown, min: number, max: number): string | undefined {
	if (typeof value !== "string") {
		return undefined;
	}
	const trimmed = value.trim();
	if (trimmed.length < min || trimmed.length > max) {
		return undefined;
	}
	return trimmed;
}
