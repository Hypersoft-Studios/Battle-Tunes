import { Resend } from "resend";
import type { MailPort } from "./ports.ts";

/**
 * Resend adapter for the contact form. The body is not logged.
 */
export function createMailPort(params: {
	apiKey: string;
	fromAddress: string;
	supportInbox: string;
}): MailPort {
	const resend = new Resend(params.apiKey);
	return {
		async sendContact({ replyTo, subject, text }): Promise<void> {
			const result = await resend.emails.send({
				from: params.fromAddress,
				to: params.supportInbox,
				replyTo,
				subject: `[Battle Tunes] ${subject}`,
				text,
			});
			if (result.error) {
				throw new Error(result.error.message);
			}
		},
	};
}
