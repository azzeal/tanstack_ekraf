import { createServerFn } from "@tanstack/react-start";

import { auth } from "@/lib/auth";
import {
	SEED_ADMIN_EMAIL,
	SEED_ADMIN_PASSWORD,
	SEED_USER_EMAIL,
	SEED_USER_PASSWORD,
	db,
	getUserRole,
} from "@/lib/db";
import { getCurrentSession } from "@/lib/session";

/**
 * Server-only session lookup. Safe to call from TanStack Router `beforeLoad`
 * (which runs on the client during client navigation) because server
 * functions always execute on the server.
 */
export const getServerSession = createServerFn({ method: "GET" }).handler(async () => {
	return getCurrentSession();
});

/**
 * Session + role in one non-throwing call.
 *
 * Route guards use this instead of calling admin-only server functions: a
 * thrown error inside a GET server function never settles on the client, so a
 * `requireAdmin()` getter would leave the page on a loading skeleton forever
 * instead of redirecting or showing an error.
 */
export const getViewer = createServerFn({ method: "GET" }).handler(async () => {
	const { session, user } = await getCurrentSession();
	if (!session || !user) {
		return { session: null, user: null, role: null };
	}
	return { session, user, role: getUserRole(user.id) };
});

/**
 * One-time development seed: creates the administrator account (password
 * hashed by Better Auth) and seeds sample products. Idempotent.
 *
 * Called from the client via `useServerFn(seedAdmin)` on the /setup page.
 */
export const seedAdmin = createServerFn({ method: "POST" }).handler(async () => {
	const hasAdmin = db.user.some((u) => {
		const role = db.userRole.find((r) => r.userId === u.id)?.role;
		return role === "admin";
	});
	if (hasAdmin) {
		return { ok: true, alreadySeeded: true, admin: SEED_ADMIN_EMAIL };
	}

	await auth.api.signUpEmail({
		body: {
			email: SEED_ADMIN_EMAIL,
			password: SEED_ADMIN_PASSWORD,
			name: "Administrator",
		},
		headers: new Headers(),
	});

	const adminUser = db.user.find((u) => u.email === SEED_ADMIN_EMAIL);
	if (adminUser) {
		const existing = db.userRole.find((r) => r.userId === adminUser.id);
		if (existing) {
			existing.role = "admin";
		} else {
			db.userRole.push({ userId: adminUser.id, role: "admin" });
		}
	}

	// A plain (non-admin) account makes the Users page and the role-change
	// modal demonstrable on a fresh clone. No `userRole` row means role "user".
	await auth.api.signUpEmail({
		body: {
			email: SEED_USER_EMAIL,
			password: SEED_USER_PASSWORD,
			name: "Editor Demo",
		},
		headers: new Headers(),
	});

	const now = new Date().toISOString();
	const products = [
		{
			name: "Starter Kit",
			description: "Everything you need to begin.",
			price: 49,
			stock: 12,
		},
		{
			name: "Pro Plan",
			description: "For growing teams.",
			price: 149,
			stock: 5,
		},
		{
			name: "Enterprise",
			description: "Self-hosted, full support.",
			price: 499,
			stock: 1,
		},
	].map((p) => ({
		id: crypto.randomUUID(),
		...p,
		createdAt: now,
		updatedAt: now,
	}));
	db.product.push(...products);

	return { ok: true, alreadySeeded: false, admin: SEED_ADMIN_EMAIL };
});
