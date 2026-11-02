import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2, LockKeyhole } from "lucide-react";
import { type FormEvent, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/login")({
	component: Login,
});

function Login() {
	const navigate = useNavigate();
	const { data: session, isPending } = authClient.useSession();
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState("");
	const [submitting, setSubmitting] = useState(false);

	useEffect(() => {
		if (!isPending && session?.user) {
			void navigate({ to: "/dashboard" });
		}
	}, [isPending, session?.user, navigate]);

	const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		setError("");
		setSubmitting(true);
		try {
			const result = await authClient.signIn.email({ email, password });
			if (result.error) {
				setError(result.error.message ?? "Invalid email or password");
				return;
			}
			await navigate({ to: "/dashboard" });
		} catch (err) {
			setError(err instanceof Error ? err.message : "Sign in failed");
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<div className="flex min-h-[70vh] items-center justify-center px-4 py-12">
			<section className="island-shell w-full max-w-md rounded-2xl p-6 sm:p-8">
				<div className="mb-6 flex flex-col items-center text-center">
					<span className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,var(--lagoon),var(--palm))] text-white shadow-[0_10px_24px_rgba(30,90,72,0.24)]">
						<LockKeyhole className="h-5 w-5" aria-hidden="true" />
					</span>
					<h1 className="display-title m-0 text-3xl font-bold text-[var(--sea-ink)]">
						Ekraf Admin
					</h1>
					<p className="m-0 mt-1 text-sm text-[var(--sea-ink-soft)]">
						Sign in with your administrator account to continue.
					</p>
				</div>

				<form onSubmit={(event) => void handleSubmit(event)} className="space-y-4">
					<div className="space-y-2">
						<Label htmlFor="login-email">Email</Label>
						<Input
							id="login-email"
							type="email"
							autoComplete="email"
							required
							value={email}
							onChange={(event) => setEmail(event.target.value)}
							placeholder="admin@example.com"
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="login-password">Password</Label>
						<Input
							id="login-password"
							type="password"
							autoComplete="current-password"
							required
							value={password}
							onChange={(event) => setPassword(event.target.value)}
							placeholder="••••••••"
						/>
					</div>

					{error ? (
						<p
							role="alert"
							className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400"
						>
							{error}
						</p>
					) : null}

					<Button type="submit" className="w-full" disabled={submitting}>
						{submitting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
						{submitting ? "Signing in..." : "Sign in"}
					</Button>
				</form>

				<p className="mt-6 text-center text-xs text-[var(--sea-ink-soft)]">
					First run?{" "}
					<a href="/setup" className="underline underline-offset-4 hover:text-[var(--sea-ink)]">
						Seed the admin account
					</a>
				</p>
			</section>
		</div>
	);
}
