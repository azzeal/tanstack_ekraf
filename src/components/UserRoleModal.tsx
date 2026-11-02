import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import type { Role } from "@/lib/db";
import { updateUserRole } from "@/lib/server/users";

export default function UserRoleModal({
	open,
	onOpenChange,
	user,
	currentUserId,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	user: { id: string; email: string; name: string | null; role: Role } | null;
	currentUserId?: string;
}) {
	const queryClient = useQueryClient();
	const updateRoleFn = useServerFn(updateUserRole);
	const [role, setRole] = useState<Role>("user");
	const [error, setError] = useState("");
	const [saving, setSaving] = useState(false);

	const isSelf = Boolean(user && currentUserId && user.id === currentUserId);

	const handleOpenChange = (next: boolean) => {
		setError("");
		if (next && user) {
			setRole(user.role);
		}
		onOpenChange(next);
	};

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>Change role</DialogTitle>
					<DialogDescription>
						{user ? `${user.name ?? "Unnamed"} · ${user.email}` : ""}
					</DialogDescription>
				</DialogHeader>

				{isSelf ? (
					<p className="rounded-xl border border-[var(--line)] bg-[var(--chip-bg)] p-3 text-sm text-[var(--sea-ink-soft)]">
						You cannot change your own role. Ask another administrator to do it.
					</p>
				) : (
					<div className="space-y-2">
						<Label htmlFor="user-role">Role</Label>
						<select
							id="user-role"
							value={role}
							onChange={(event) => setRole(event.target.value as Role)}
							className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-base shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 md:text-sm dark:bg-input/30"
						>
							<option value="user">User</option>
							<option value="admin">Administrator</option>
						</select>
						<p className="text-xs text-[var(--sea-ink-soft)]">
							Administrators can manage products, users and roles.
						</p>
					</div>
				)}

				{error ? (
					<p
						role="alert"
						className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400"
					>
						{error}
					</p>
				) : null}

				<DialogFooter>
					<Button
						type="button"
						variant="outline"
						onClick={() => onOpenChange(false)}
						disabled={saving}
					>
						Cancel
					</Button>
					<Button
						type="button"
						disabled={saving || isSelf || !user}
						onClick={async () => {
							if (!user) return;
							setSaving(true);
							setError("");
							try {
								await updateRoleFn({ data: { userId: user.id, role } });
								await queryClient.invalidateQueries({ queryKey: ["users"] });
								onOpenChange(false);
							} catch (err) {
								setError(err instanceof Error ? err.message : "Role update failed");
							} finally {
								setSaving(false);
							}
						}}
					>
						{saving ? "Saving..." : "Save role"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
