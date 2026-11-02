import { Link, createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";

import { seedAdmin } from "@/lib/server/auth";

export const Route = createFileRoute("/setup")({ component: Setup });

function Setup() {
	const seedAdminFn = useServerFn(seedAdmin);
	const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
	const [message, setMessage] = useState("");

	const handleSeed = async () => {
		setStatus("loading");
		setMessage("");
		try {
			const result = await seedAdminFn();
			setStatus("success");
			setMessage(
				result.alreadySeeded
					? "Admin account already exists."
					: "Admin account seeded. Sign in with admin@example.com / admin12345",
			);
		} catch (err) {
			setStatus("error");
			setMessage(err instanceof Error ? err.message : "Seed failed");
		}
	};

	return (
		<main className="page-wrap px-4 py-12">
			<section className="island-shell rounded-2xl p-6 sm:p-8">
				<p className="island-kicker mb-2">Setup</p>
				<h1 className="display-title mb-3 text-4xl font-bold text-[var(--sea-ink)] sm:text-5xl">
					Seed Admin Account
				</h1>
				<p className="m-0 max-w-2xl text-base leading-8 text-[var(--sea-ink-soft)]">
					This creates the administrator account (password is hashed by Better Auth) and seeds
					sample products. Run this once after deploying.
				</p>

				<div className="mt-8">
					<button
						type="button"
						onClick={handleSeed}
						disabled={status === "loading"}
						className="rounded-xl border border-[var(--line)] bg-[var(--chip-bg)] px-5 py-3 text-sm font-semibold text-[var(--sea-ink)] no-underline transition hover:bg-[var(--link-bg-hover)] disabled:opacity-50"
					>
						{status === "loading" ? "Seeding..." : "Seed Admin Account"}
					</button>

					{status !== "idle" && (
						<div className="mt-4 p-4 rounded-xl bg-[var(--chip-bg)] border border-[var(--line)]">
							<p
								className={`m-0 text-sm ${
									status === "success"
										? "text-green-700 dark:text-green-400"
										: status === "error"
											? "text-red-700 dark:text-red-400"
											: "text-[var(--sea-ink-soft)]"
								}`}
							>
								{message}
							</p>
						</div>
					)}

					<div className="mt-6">
						<p className="m-0 text-sm text-[var(--sea-ink-soft)]">
							Already have an account?{" "}
							<Link
								to="/login"
								className="underline underline-offset-4 font-medium hover:text-[var(--sea-ink)]"
							>
								Sign in
							</Link>
						</p>
					</div>
				</div>
			</section>
		</main>
	);
}
