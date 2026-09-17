export type ApiErrorBody = {
	code: string;
	message: string;
};

async function parseJson(response: Response): Promise<unknown> {
	try {
		return await response.json();
	} catch {
		return undefined;
	}
}

function isErrorBody(value: unknown): value is ApiErrorBody {
	return (
		typeof value === "object" &&
		value !== null &&
		"code" in value &&
		"message" in value &&
		typeof value.code === "string" &&
		typeof value.message === "string"
	);
}

export async function postCheckout(token: string): Promise<{ checkoutUrl: string } | ApiErrorBody> {
	const response = await fetch("/api/checkout", {
		method: "POST",
		headers: { authorization: `Bearer ${token}` },
	});
	const body = await parseJson(response);
	if (
		response.ok &&
		typeof body === "object" &&
		body !== null &&
		"checkoutUrl" in body &&
		typeof body.checkoutUrl === "string"
	) {
		return { checkoutUrl: body.checkoutUrl };
	}
	if (isErrorBody(body)) {
		return body;
	}
	return { code: "STRIPE_ERROR", message: "Payment is unavailable." };
}

export async function postReconcile(
	token: string,
	sessionId: string,
): Promise<{ isPaid: true } | ApiErrorBody> {
	const response = await fetch("/api/reconcile", {
		method: "POST",
		headers: {
			authorization: `Bearer ${token}`,
			"content-type": "application/json",
		},
		body: JSON.stringify({ sessionId }),
	});
	const body = await parseJson(response);
	if (
		response.ok &&
		typeof body === "object" &&
		body !== null &&
		"isPaid" in body &&
		body.isPaid === true
	) {
		return { isPaid: true };
	}
	if (isErrorBody(body)) {
		return body;
	}
	return { code: "STRIPE_ERROR", message: "Payment is unavailable." };
}

export async function postContact(input: {
	email: string;
	subject: string;
	message: string;
}): Promise<{ sent: true } | ApiErrorBody> {
	const response = await fetch("/api/contact", {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify(input),
	});
	const body = await parseJson(response);
	if (
		response.ok &&
		typeof body === "object" &&
		body !== null &&
		"sent" in body &&
		body.sent === true
	) {
		return { sent: true };
	}
	if (isErrorBody(body)) {
		return body;
	}
	return { code: "EMAIL_ERROR", message: "Could not send the message." };
}
