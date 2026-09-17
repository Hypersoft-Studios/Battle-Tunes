export type AccessState = "signed-out" | "unpaid" | "paid";

/**
 * Map a Clerk user (or none) to the three `/` access states.
 * Only boolean `true` counts as paid — strings and missing flags stay unpaid.
 */
export function accessStateFromUser(
	user: { publicMetadata?: Record<string, unknown> } | null | undefined,
): AccessState {
	if (!user) {
		return "signed-out";
	}
	if (user.publicMetadata?.isPaid === true) {
		return "paid";
	}
	return "unpaid";
}
