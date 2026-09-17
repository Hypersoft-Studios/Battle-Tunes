export interface ContactFormProps {
	onSubmit: (input: { email: string; subject: string; message: string }) => Promise<void>;
	busy: boolean;
	error: string | undefined;
	sent: boolean;
}

/** Contact form presenter. The container posts to `/api/contact`; nothing is stored locally. */
export function ContactForm({ onSubmit, busy, error, sent }: ContactFormProps) {
	return (
		<form
			className="contact-form"
			data-testid="contact-form"
			onSubmit={(event) => {
				event.preventDefault();
				const data = new FormData(event.currentTarget);
				void onSubmit({
					email: String(data.get("email") ?? ""),
					subject: String(data.get("subject") ?? ""),
					message: String(data.get("message") ?? ""),
				});
			}}
		>
			<label htmlFor="contact-email">Email</label>
			<input
				id="contact-email"
				name="email"
				type="email"
				autoComplete="email"
				required
				maxLength={254}
				disabled={busy}
			/>
			<label htmlFor="contact-subject">Subject</label>
			<input
				id="contact-subject"
				name="subject"
				type="text"
				required
				maxLength={120}
				disabled={busy}
			/>
			<label htmlFor="contact-message">Message</label>
			<textarea
				id="contact-message"
				name="message"
				required
				maxLength={5000}
				rows={5}
				disabled={busy}
			/>
			<button type="submit" className="button" disabled={busy} aria-busy={busy}>
				{busy ? "Sending…" : "Send message"}
			</button>
			{error ? (
				<p className="error" role="alert">
					{error}
				</p>
			) : null}
			{sent ? (
				<p className="success" role="status">
					Message sent.
				</p>
			) : null}
		</form>
	);
}
