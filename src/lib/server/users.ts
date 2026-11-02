import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { db, getUserRole, removeUserRole, setUserRole } from "@/lib/db";
import { httpError } from "@/lib/server/http-error";
import { requireAdmin } from "@/lib/session";

export const userRoleSchema = z
	.object({
		userId: z.string(),
		role: z.enum(["admin", "user"]),
	})
	.strict();

export const getUsers = createServerFn({ method: "GET" }).handler(async () => {
	await requireAdmin();
	return db.user.map((u) => ({
		id: u.id,
		email: u.email,
		name: u.name,
		role: getUserRole(u.id),
		emailVerified: !!u.emailVerified,
		createdAt: u.createdAt.toISOString(),
	}));
});

export const updateUserRole = createServerFn({ method: "POST" })
	.validator(userRoleSchema)
	.handler(async ({ data }) => {
		const { user: actor } = await requireAdmin();

		// An admin who can demote themselves can lock the app out entirely
		// (or be tricked into doing it via a crafted link/CSRF attempt).
		if (data.userId === actor.id) {
			throw httpError(400, "You cannot change your own role");
		}

		const currentRole = getUserRole(data.userId);
		const adminCount = db.userRole.filter((r) => r.role === "admin").length;
		if (currentRole === "admin" && data.role !== "admin" && adminCount <= 1) {
			throw httpError(400, "Cannot demote the last administrator");
		}

		setUserRole(data.userId, data.role);
		return { ok: true };
	});

export const deleteUser = createServerFn({ method: "POST" })
	.validator(z.object({ userId: z.string() }).strict())
	.handler(async ({ data }) => {
		const { user: actor } = await requireAdmin();

		// Self-deletion would silently drop the only admin session.
		if (data.userId === actor.id) {
			throw httpError(400, "You cannot delete your own account");
		}

		// Prevent removing the last administrator so the app never locks itself out.
		const role = getUserRole(data.userId);
		if (role === "admin") {
			const adminCount = db.userRole.filter((r) => r.role === "admin").length;
			if (adminCount <= 1) {
				throw httpError(400, "Cannot delete the last administrator");
			}
		}
		db.user = db.user.filter((u) => u.id !== data.userId);
		removeUserRole(data.userId);
		return { ok: true };
	});
