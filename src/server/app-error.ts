/**
 * API error returned to clients as `{ code, message }` without stack traces.
 */
export class AppError extends Error {
	readonly code: string;
	readonly status: number;

	constructor(code: string, status: number, message: string) {
		super(message);
		this.name = "AppError";
		this.code = code;
		this.status = status;
	}
}
