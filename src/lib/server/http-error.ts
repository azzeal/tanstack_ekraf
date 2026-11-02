/** Error carrying an HTTP status so route handlers can surface it properly. */
export function httpError(status: number, message: string): Error & { status?: number } {
	const err = new Error(message) as Error & { status?: number };
	err.status = status;
	return err;
}
