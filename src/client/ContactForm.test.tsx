// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { ContactForm } from "./ContactForm.tsx";

describe("ContactForm", () => {
	it("submits email, subject, and message", async () => {
		const user = userEvent.setup();
		const submitted: Array<{ email: string; subject: string; message: string }> = [];
		render(
			<ContactForm
				busy={false}
				error={undefined}
				sent={false}
				onSubmit={async (input) => {
					submitted.push(input);
				}}
			/>,
		);
		await user.type(screen.getByLabelText("Email"), "fan@example.com");
		await user.type(screen.getByLabelText("Subject"), "Need help");
		await user.type(screen.getByLabelText("Message"), "The pads are silent.");
		await user.click(screen.getByRole("button", { name: "Send message" }));
		expect(submitted).toEqual([
			{ email: "fan@example.com", subject: "Need help", message: "The pads are silent." },
		]);
	});

	it("announces a send failure next to the form", () => {
		render(
			<ContactForm
				busy={false}
				error="Could not send the message."
				sent={false}
				onSubmit={async () => undefined}
			/>,
		);
		expect(screen.getByRole("alert")).toHaveTextContent("Could not send the message.");
	});
});
