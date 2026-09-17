import { describe, expect, it } from "vitest";
import { handleContact } from "./contact.ts";
import { silentLogger } from "./logger.ts";
import type { MailPort, RateLimiter } from "./ports.ts";

function limiter(allow: boolean): RateLimiter {
	return { allow: () => allow };
}

function mail(
	onSend?: (input: { replyTo: string; subject: string; text: string }) => void,
): MailPort {
	return {
		async sendContact(input): Promise<void> {
			onSend?.(input);
		},
	};
}

describe("contact", () => {
	it("sends a valid payload through Resend", async () => {
		const sent: Array<{ replyTo: string; subject: string; text: string }> = [];
		const result = await handleContact(
			{
				email: "fan@example.com",
				subject: "Need help",
				message: "The pads are silent.",
				clientKey: "1.1.1.1",
			},
			{ mail: mail((input) => sent.push(input)), rateLimiter: limiter(true), logger: silentLogger },
		);
		expect(result).toEqual({ sent: true });
		expect(sent).toEqual([
			{ replyTo: "fan@example.com", subject: "Need help", text: "The pads are silent." },
		]);
	});

	it("rejects an invalid email", async () => {
		await expect(
			handleContact(
				{ email: "not-an-email", subject: "Hi", message: "Hello", clientKey: "1.1.1.1" },
				{ mail: mail(), rateLimiter: limiter(true), logger: silentLogger },
			),
		).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
	});

	it("rejects a subject that is too long", async () => {
		await expect(
			handleContact(
				{
					email: "fan@example.com",
					subject: "x".repeat(121),
					message: "Hello",
					clientKey: "1.1.1.1",
				},
				{ mail: mail(), rateLimiter: limiter(true), logger: silentLogger },
			),
		).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
	});

	it("rejects an empty message", async () => {
		await expect(
			handleContact(
				{ email: "fan@example.com", subject: "Hi", message: "", clientKey: "1.1.1.1" },
				{ mail: mail(), rateLimiter: limiter(true), logger: silentLogger },
			),
		).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
	});

	it("rejects a message that is too long", async () => {
		await expect(
			handleContact(
				{
					email: "fan@example.com",
					subject: "Hi",
					message: "x".repeat(5001),
					clientKey: "1.1.1.1",
				},
				{ mail: mail(), rateLimiter: limiter(true), logger: silentLogger },
			),
		).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
	});

	it("returns RATE_LIMITED when the limiter denies the caller", async () => {
		await expect(
			handleContact(
				{ email: "fan@example.com", subject: "Hi", message: "Hello", clientKey: "1.1.1.1" },
				{ mail: mail(), rateLimiter: limiter(false), logger: silentLogger },
			),
		).rejects.toMatchObject({ code: "RATE_LIMITED" });
	});

	it("maps mail failures to EMAIL_ERROR", async () => {
		await expect(
			handleContact(
				{ email: "fan@example.com", subject: "Hi", message: "Hello", clientKey: "1.1.1.1" },
				{
					mail: {
						async sendContact(): Promise<void> {
							throw new Error("resend down");
						},
					},
					rateLimiter: limiter(true),
					logger: silentLogger,
				},
			),
		).rejects.toMatchObject({ code: "EMAIL_ERROR" });
	});

	it("does not send mail when validation fails", async () => {
		const sent: unknown[] = [];
		await handleContact(
			{ email: "bad", subject: "Hi", message: "Hello", clientKey: "1.1.1.1" },
			{ mail: mail((input) => sent.push(input)), rateLimiter: limiter(true), logger: silentLogger },
		).catch(() => undefined);
		expect(sent).toEqual([]);
	});
});
