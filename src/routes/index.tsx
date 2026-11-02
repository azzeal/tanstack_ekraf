import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowRight, Package, ShieldCheck, Users } from "lucide-react";

import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/")({ component: Home });

const FEATURES = [
	{
		title: "Products",
		text: "Create, edit and delete catalogue entries with server-side validation on every write.",
		icon: Package,
	},
	{
		title: "Roles & access",
		text: "Role changes and account deletion are enforced on the server, not just hidden in the UI.",
		icon: ShieldCheck,
	},
	{
		title: "Accounts",
		text: "Better Auth sessions with httpOnly, SameSite cookies and rate-limited sign-in attempts.",
		icon: Users,
	},
] as const;

function Home() {
	const { data: session, isPending } = authClient.useSession();

	return (
		<main className="page-wrap px-4 py-12">
			<section className="island-shell rise-in rounded-2xl p-6 sm:p-10">
				<p className="island-kicker mb-3">Ekraf Admin</p>
				<h1 className="display-title mb-3 text-4xl font-bold text-[var(--sea-ink)] sm:text-5xl">
					Product &amp; user administration
				</h1>
				<p className="m-0 max-w-3xl text-base leading-8 text-[var(--sea-ink-soft)]">
					A secure admin dashboard built with TanStack Start, TanStack Table and Better Auth. Every
					mutating server function validates its input and checks who you are before it writes.
				</p>

				{isPending ? (
					<p className="mt-8 text-sm text-[var(--sea-ink-soft)]">Checking your session...</p>
				) : session?.user ? (
					<div className="mt-8 flex flex-wrap items-center gap-4">
						<div className="rounded-xl border border-[var(--line)] bg-[var(--chip-bg)] p-4">
							<p className="m-0 text-sm text-[var(--sea-ink-soft)]">
								Signed in as <span className="font-semibold">{session.user.email}</span>
							</p>
						</div>
						<Link
							to="/dashboard"
							className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground no-underline transition hover:bg-primary/90"
						>
							Open dashboard
							<ArrowRight className="h-4 w-4" aria-hidden="true" />
						</Link>
					</div>
				) : (
					<div className="mt-8 flex flex-wrap items-center gap-4">
						<Link
							to="/login"
							className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground no-underline transition hover:bg-primary/90"
						>
							Sign in
							<ArrowRight className="h-4 w-4" aria-hidden="true" />
						</Link>
						<p className="m-0 text-sm text-[var(--sea-ink-soft)]">
							First run?{" "}
							<Link
								to="/setup"
								className="font-medium underline underline-offset-4 hover:text-[var(--sea-ink)]"
							>
								Seed the admin account
							</Link>
						</p>
					</div>
				)}
			</section>

			<div className="mt-8 grid gap-4 sm:grid-cols-3">
				{FEATURES.map(({ title, text, icon: Icon }) => (
					<article key={title} className="feature-card rounded-2xl border border-[var(--line)] p-5">
						<span className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--chip-bg)] text-[var(--sea-ink)]">
							<Icon className="h-4 w-4" aria-hidden="true" />
						</span>
						<h2 className="m-0 text-base font-semibold text-[var(--sea-ink)]">{title}</h2>
						<p className="m-0 mt-1 text-sm leading-6 text-[var(--sea-ink-soft)]">{text}</p>
					</article>
				))}
			</div>
		</main>
	);
}
