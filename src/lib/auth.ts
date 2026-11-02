import { betterAuth } from "better-auth";
import { tanstackStartCookies } from "better-auth/tanstack-start";

import { adapter } from "./db";

const baseURL = process.env.BETTER_AUTH_URL;
const isProduction = process.env.NODE_ENV === "production";

/**
 * Origins better-auth accepts state-changing requests from.
 *
 * `BETTER_AUTH_URL` points at `localhost`, but the dev server is routinely
 * opened as `127.0.0.1` (previews, `--host 127.0.0.1`). Without the loopback
 * aliases those requests are rejected with `INVALID_ORIGIN`, which breaks sign
 * in/out locally. Production keeps exactly one origin.
 */
function trustedOrigins(): string[] {
	if (!baseURL) return [];
	const origins = new Set<string>([baseURL]);
	try {
		const url = new URL(baseURL);
		origins.add(url.origin);
		const isLoopback = ["localhost", "127.0.0.1", "::1", "[::1]"].includes(url.hostname);
		if (!isProduction && isLoopback) {
			const port = url.port ? `:${url.port}` : "";
			for (const host of ["localhost", "127.0.0.1", "[::1]"]) {
				origins.add(`${url.protocol}//${host}${port}`);
			}
		}
	} catch {
		// A malformed BETTER_AUTH_URL is reported by better-auth itself.
	}
	return [...origins];
}

export const auth = betterAuth({
	database: adapter,
	baseURL,
	// Reject cross-site requests that carry the victim's session cookie (CSRF).
	trustedOrigins: trustedOrigins(),
	emailAndPassword: {
		enabled: true,
		requireEmailVerification: false,
	},
	advanced: {
		defaultCookieAttributes: {
			httpOnly: true,
			sameSite: "lax",
			// `secure` over plain http would make the browser drop the cookie,
			// so it is enabled only where the app is actually served over TLS.
			secure: isProduction,
			path: "/",
		},
	},
	session: {
		expiresIn: 60 * 60 * 24 * 7, // 7 days
		updateAge: 60 * 60 * 24, // 1 day
		cookieCache: {
			enabled: true,
			maxAge: 60 * 15,
		},
	},
	plugins: [tanstackStartCookies()],
});

export default auth;
