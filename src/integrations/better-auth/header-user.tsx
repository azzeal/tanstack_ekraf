import { Link } from "@tanstack/react-router";
import { authClient } from "#/lib/auth-client";

export default function BetterAuthHeader() {
	const { data: session, isPending } = authClient.useSession();

	if (isPending) {
		return <div className="h-8 w-8 bg-neutral-100 dark:bg-neutral-800 animate-pulse" />;
	}

	if (session?.user) {
		return (
			<div className="flex items-center gap-2">
				{session.user.image ? (
					<img src={session.user.image} alt="" className="h-8 w-8" />
				) : (
					<div className="h-8 w-8 bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
						<span className="text-xs font-medium text-neutral-600 dark:text-neutral-400">
							{session.user.name?.charAt(0).toUpperCase() || "U"}
						</span>
					</div>
				)}
				<button
					type="button"
					onClick={() => {
						void authClient.signOut().then(() => {
							window.location.href = "/login";
						});
					}}
					className="h-9 rounded-xl border border-[var(--chip-line)] bg-[var(--chip-bg)] px-4 text-sm font-semibold text-[var(--sea-ink)] transition hover:bg-[var(--link-bg-hover)]"
				>
					Sign out
				</button>
			</div>
		);
	}

	return (
		<Link
			to="/login"
			className="inline-flex h-9 items-center rounded-xl border border-[var(--chip-line)] bg-[var(--chip-bg)] px-4 text-sm font-semibold text-[var(--sea-ink)] no-underline transition hover:bg-[var(--link-bg-hover)]"
		>
			Sign in
		</Link>
	);
}
