import { createFileRoute } from "@tanstack/react-router";

import { auth } from "#/lib/auth";
import { checkRateLimit, clearAttempts, recordFailedAttempt } from "#/lib/rate-limit";

const SIGN_IN_PATH_SUFFIX = "/sign-in/email";
const SIGN_IN_LIMIT = 5;
const SIGN_IN_WINDOW_MS = 60_000;

function clientIp(request: Request): string {
	const forwarded = request.headers.get("x-forwarded-for");
	const first = forwarded?.split(",")[0]?.trim();
	return first || request.headers.get("x-real-ip") || "unknown";
}

async function handleAuth(request: Request): Promise<Response> {
	const url = new URL(request.url);
	if (request.method !== "POST" || !url.pathname.endsWith(SIGN_IN_PATH_SUFFIX)) {
		return auth.handler(request);
	}

	let email = "";
	try {
		const body = (await request.clone().json()) as { email?: unknown };
		if (typeof body.email === "string") {
			email = body.email.toLowerCase();
		}
	} catch {
		// Not JSON: better-auth answers with its own error below.
	}
	const key = `sign-in:${clientIp(request)}:${email}`;

	const verdict = checkRateLimit(key, { limit: SIGN_IN_LIMIT, windowMs: SIGN_IN_WINDOW_MS });
	if (!verdict.ok) {
		return new Response(
			JSON.stringify({
				message: `Too many sign-in attempts. Try again in ${verdict.retryAfterSeconds} seconds.`,
			}),
			{
				status: 429,
				headers: {
					"content-type": "application/json",
					"retry-after": String(verdict.retryAfterSeconds),
				},
			},
		);
	}

	const response = await auth.handler(request);
	if (response.ok) {
		// A successful sign-in clears the counter so a real user is not
		// punished later for earlier typos.
		clearAttempts(key);
	} else {
		recordFailedAttempt(key);
	}
	return response;
}

export const Route = createFileRoute("/api/auth/$")({
	server: {
		handlers: {
			GET: ({ request }) => auth.handler(request),
			POST: ({ request }) => handleAuth(request),
		},
	},
});
