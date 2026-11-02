import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";

import AdminShell from "@/components/admin/AdminShell";
import { getViewer } from "@/lib/server/auth";

/**
 * Pathless layout: every route under `_admin/` (dashboard, products, users)
 * renders inside the sidebar shell and is gated by a single server-side
 * session check. The resolved viewer (user + role) is returned from
 * `beforeLoad`, so child routes can gate themselves without firing a
 * server-only query that would fail closed.
 */
export const Route = createFileRoute("/_admin")({
	beforeLoad: async () => {
		const viewer = await getViewer();
		if (!viewer.session || !viewer.user) {
			throw redirect({ to: "/login" });
		}
		return { viewer };
	},
	component: AdminLayout,
});

function AdminLayout() {
	const { viewer } = Route.useRouteContext();

	return (
		<AdminShell canManageUsers={viewer.role === "admin"}>
			<Outlet />
		</AdminShell>
	);
}
