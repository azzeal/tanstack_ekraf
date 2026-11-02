/**
 * In-memory sliding-window rate limiter.
 *
 * The app deliberately has no database (CHEATSHEET.md: "Don't add a
 * database"), so attempt counters live in this process. On Vercel that means
 * the window is per serverless instance and resets on cold start — it slows
 * down brute force, it does not replace a shared store. See NOTES.md.
 */

type Bucket = number[];

const buckets = new Map<string, Bucket>();

/** Hard cap on tracked keys so a hostile client cycling emails cannot exhaust memory. */
const MAX_KEYS = 5_000;

export type RateLimitResult = {
	ok: boolean;
	retryAfterSeconds: number;
	remaining: number;
};

export function checkRateLimit(
	key: string,
	{ limit, windowMs }: { limit: number; windowMs: number },
	now = Date.now(),
): RateLimitResult {
	const cutoff = now - windowMs;
	const bucket = (buckets.get(key) ?? []).filter((timestamp) => timestamp > cutoff);

	if (bucket.length >= limit) {
		const oldest = bucket[0] ?? now;
		buckets.set(key, bucket);
		return {
			ok: false,
			retryAfterSeconds: Math.max(1, Math.ceil((oldest + windowMs - now) / 1000)),
			remaining: 0,
		};
	}

	buckets.set(key, bucket);
	return {
		ok: true,
		retryAfterSeconds: 0,
		remaining: limit - bucket.length,
	};
}

export function recordFailedAttempt(key: string): void {
	const bucket = buckets.get(key) ?? [];
	bucket.push(Date.now());
	if (!buckets.has(key) && buckets.size >= MAX_KEYS) {
		// Drop the oldest bucket instead of growing without bound.
		const oldestKey = buckets.keys().next().value;
		if (oldestKey !== undefined) {
			buckets.delete(oldestKey);
		}
	}
	buckets.set(key, bucket);
}

/** Clear a key after a successful attempt so a legitimate user is not punished later. */
export function clearAttempts(key: string): void {
	buckets.delete(key);
}
