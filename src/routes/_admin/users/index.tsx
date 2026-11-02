import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { createColumnHelper, flexRender, tableFeatures, useTable } from "@tanstack/react-table";
import { ShieldCheck, Trash2, UserCog } from "lucide-react";
import { useState } from "react";

import UserRoleModal from "@/components/UserRoleModal";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import type { Role } from "@/lib/db";
import { deleteUser, getUsers } from "@/lib/server/users";

type UserRow = {
	id: string;
	email: string;
	name: string | null;
	role: Role;
	emailVerified: boolean;
	createdAt: string;
};

export const Route = createFileRoute("/_admin/users/")({
	// The role check happens before the page mounts: `getUsers` is admin-only
	// and a rejected server function would otherwise leave the table on a
	// permanent skeleton.
	beforeLoad: ({ context }) => {
		if (context.viewer.role !== "admin") {
			throw redirect({ to: "/dashboard" });
		}
	},
	component: Users,
});

function Users() {
	const queryClient = useQueryClient();
	const { viewer } = Route.useRouteContext();
	const usersQuery = useQuery({
		queryKey: ["users"],
		queryFn: async () => getUsers(),
	});
	const deleteFn = useServerFn(deleteUser);

	const currentUserId = viewer.user?.id;
	const users = usersQuery.data ?? [];
	const adminCount = users.filter((u) => u.role === "admin").length;

	const [roleModalUser, setRoleModalUser] = useState<UserRow | null>(null);
	const [pendingDelete, setPendingDelete] = useState<UserRow | null>(null);
	const [deleteError, setDeleteError] = useState("");
	const [deleting, setDeleting] = useState(false);

	const features = tableFeatures({});
	const columnHelper = createColumnHelper<typeof features, UserRow>();

	const openRoleModal = (user: UserRow) => setRoleModalUser(user);
	const canDelete = (user: UserRow) =>
		!(currentUserId && user.id === currentUserId) && !(user.role === "admin" && adminCount <= 1);

	const columns = columnHelper.columns([
		columnHelper.accessor("name", {
			header: "Name",
			cell: (info) => {
				const user = info.row.original as UserRow;
				return (
					<span className="flex items-center gap-2">
						{user.name ?? "—"}
						{user.id === currentUserId ? (
							<span className="rounded-full bg-[var(--chip-bg)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--sea-ink-soft)]">
								You
							</span>
						) : null}
					</span>
				);
			},
		}),
		columnHelper.accessor("email", { header: "Email" }),
		columnHelper.accessor("role", {
			header: "Role",
			cell: (info) => {
				const user = info.row.original as UserRow;
				return (
					<button
						type="button"
						onClick={() => openRoleModal(user)}
						className="inline-flex items-center gap-1.5 rounded-full border border-[var(--chip-line)] bg-[var(--chip-bg)] px-2.5 py-1 text-xs font-semibold text-[var(--sea-ink)] transition hover:bg-[var(--link-bg-hover)]"
					>
						<UserCog className="h-3.5 w-3.5" aria-hidden="true" />
						{user.role === "admin" ? "Administrator" : "User"}
					</button>
				);
			},
		}),
		columnHelper.accessor("emailVerified", {
			header: "Verified",
			cell: (info) => (info.getValue() ? "Yes" : "No"),
		}),
		columnHelper.accessor("createdAt", {
			header: "Joined",
			cell: (info) => new Date(info.getValue() as string).toLocaleDateString(),
		}),
		columnHelper.display({
			id: "actions",
			header: "Actions",
			cell: (info) => {
				const user = info.row.original as UserRow;
				if (!canDelete(user)) {
					return (
						<span className="text-xs text-[var(--sea-ink-soft)]">
							{currentUserId && user.id === currentUserId ? "Your account" : "Last admin"}
						</span>
					);
				}
				return (
					<Button
						type="button"
						variant="ghost"
						size="sm"
						className="text-red-600 hover:text-red-700 dark:text-red-400"
						onClick={() => setPendingDelete(user)}
					>
						<Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
						Delete
					</Button>
				);
			},
		}),
	]);

	const table = useTable({ features, columns, data: users });

	const handleDelete = async () => {
		if (!pendingDelete) return;
		setDeleting(true);
		setDeleteError("");
		try {
			await deleteFn({ data: { userId: pendingDelete.id } });
			await queryClient.invalidateQueries({ queryKey: ["users"] });
			setPendingDelete(null);
		} catch (err) {
			setDeleteError(err instanceof Error ? err.message : "Delete failed");
		} finally {
			setDeleting(false);
		}
	};

	return (
		<div className="space-y-6">
			<header>
				<p className="island-kicker mb-2">Users</p>
				<h1 className="display-title text-3xl font-bold text-[var(--sea-ink)] sm:text-4xl">
					Users
				</h1>
				<p className="mt-1 text-[var(--sea-ink-soft)]">
					Manage accounts and roles. Administrator only.
				</p>
			</header>

			{usersQuery.isPending ? (
				<div className="space-y-2" aria-busy="true">
					{[0, 1].map((index) => (
						<div
							key={index}
							className="h-14 animate-pulse rounded-xl border border-[var(--line)] bg-[var(--chip-bg)]"
						/>
					))}
				</div>
			) : usersQuery.isError ? (
				<div className="rounded-xl border border-red-200 bg-red-50 p-5 dark:border-red-800 dark:bg-red-900/20">
					<p className="m-0 text-sm text-red-700 dark:text-red-400">
						Failed to load users: {(usersQuery.error as Error).message}
					</p>
					<Button
						type="button"
						variant="outline"
						size="sm"
						className="mt-3"
						onClick={() => usersQuery.refetch()}
					>
						Try again
					</Button>
				</div>
			) : users.length === 0 ? (
				<div className="rounded-xl border border-dashed border-[var(--line)] bg-[var(--chip-bg)] p-10 text-center">
					<p className="m-0 font-medium text-[var(--sea-ink)]">No users yet</p>
					<p className="mt-1 text-sm text-[var(--sea-ink-soft)]">
						Accounts appear here after they sign up.
					</p>
				</div>
			) : (
				<>
					{/* Desktop table */}
					<div className="hidden overflow-x-auto rounded-xl border border-[var(--line)] bg-[var(--chip-bg)] sm:block">
						<table className="w-full text-sm border-collapse">
							<thead>
								{table.getHeaderGroups().map((headerGroup) => (
									<tr key={headerGroup.id}>
										{headerGroup.headers.map((header) => (
											<th
												key={header.id}
												colSpan={header.colSpan}
												className="px-4 py-3 text-left text-xs font-semibold text-[var(--sea-ink-soft)]"
											>
												{header.isPlaceholder
													? null
													: flexRender(header.column.columnDef.header, header.getContext())}
											</th>
										))}
									</tr>
								))}
							</thead>
							<tbody>
								{table.getRowModel().rows.map((row) => (
									<tr key={row.id} className="border-t border-[var(--line)]">
										{row.getAllCells().map((cell) => (
											<td key={cell.id} className="px-4 py-3 align-middle">
												{flexRender(cell.column.columnDef.cell, cell.getContext())}
											</td>
										))}
									</tr>
								))}
							</tbody>
						</table>
					</div>

					{/* Mobile cards */}
					<ul className="space-y-3 sm:hidden">
						{users.map((user) => (
							<li
								key={user.id}
								className="rounded-xl border border-[var(--line)] bg-[var(--chip-bg)] p-4"
							>
								<div className="flex items-start justify-between gap-3">
									<div className="min-w-0">
										<p className="m-0 flex items-center gap-2 font-semibold text-[var(--sea-ink)]">
											<span className="truncate">{user.name ?? "—"}</span>
											{user.id === currentUserId ? (
												<span className="rounded-full bg-[var(--chip-bg)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--sea-ink-soft)]">
													You
												</span>
											) : null}
										</p>
										<p className="m-0 mt-0.5 break-all text-sm text-[var(--sea-ink-soft)]">
											{user.email}
										</p>
									</div>
									{user.role === "admin" ? (
										<ShieldCheck
											className="h-4 w-4 shrink-0 text-[var(--palm)]"
											aria-hidden="true"
										/>
									) : null}
								</div>
								<div className="mt-3 flex flex-wrap items-center gap-2">
									<button
										type="button"
										onClick={() => openRoleModal(user)}
										className="inline-flex items-center gap-1.5 rounded-full border border-[var(--chip-line)] bg-[var(--chip-bg)] px-2.5 py-1 text-xs font-semibold text-[var(--sea-ink)] transition hover:bg-[var(--link-bg-hover)]"
									>
										<UserCog className="h-3.5 w-3.5" aria-hidden="true" />
										{user.role === "admin" ? "Administrator" : "User"}
									</button>
									<span className="text-xs text-[var(--sea-ink-soft)]">
										Joined {new Date(user.createdAt).toLocaleDateString()}
									</span>
									{canDelete(user) ? (
										<Button
											type="button"
											variant="ghost"
											size="sm"
											className="ml-auto text-red-600 hover:text-red-700 dark:text-red-400"
											onClick={() => setPendingDelete(user)}
										>
											<Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
											Delete
										</Button>
									) : (
										<span className="ml-auto text-xs text-[var(--sea-ink-soft)]">
											{currentUserId && user.id === currentUserId ? "Your account" : "Last admin"}
										</span>
									)}
								</div>
							</li>
						))}
					</ul>
				</>
			)}

			<UserRoleModal
				open={Boolean(roleModalUser)}
				onOpenChange={(next) => {
					if (!next) setRoleModalUser(null);
				}}
				user={roleModalUser}
				currentUserId={currentUserId}
			/>

			<Dialog
				open={Boolean(pendingDelete)}
				onOpenChange={(next) => {
					if (!next) setPendingDelete(null);
				}}
			>
				<DialogContent className="sm:max-w-sm">
					<DialogHeader>
						<DialogTitle>Delete user?</DialogTitle>
						<DialogDescription>
							{pendingDelete ? `${pendingDelete.email} will lose access immediately.` : ""}
						</DialogDescription>
					</DialogHeader>
					{deleteError ? (
						<p role="alert" className="text-sm text-red-600 dark:text-red-400">
							{deleteError}
						</p>
					) : null}
					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => setPendingDelete(null)}
							disabled={deleting}
						>
							Cancel
						</Button>
						<Button
							type="button"
							variant="destructive"
							onClick={() => void handleDelete()}
							disabled={deleting}
						>
							{deleting ? "Deleting..." : "Delete"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
