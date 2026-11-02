import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";

import { getProducts } from "@/lib/server/products";
import { getUsers } from "@/lib/server/users";

export const Route = createFileRoute("/_admin/dashboard")({
	component: Dashboard,
});

function Dashboard() {
	const { viewer } = Route.useRouteContext();
	const isAdmin = viewer.role === "admin";

	const productsQuery = useQuery({
		queryKey: ["dashboard", "products"],
		queryFn: async () => getProducts(),
	});
	// `getUsers` requires an administrator, so a regular account must never ask
	// for it. Disabling the query keeps the page loading state honest.
	const usersQuery = useQuery({
		queryKey: ["dashboard", "users"],
		queryFn: async () => getUsers(),
		enabled: isAdmin,
	});

	const products = productsQuery.data ?? [];
	const users = usersQuery.data ?? [];
	const adminCount = users.filter((u) => u.role === "admin").length;
	const lowStock = products.filter((p) => p.stock <= 5).length;
	const isLoading = productsQuery.isPending || (isAdmin && usersQuery.isPending);

	return (
		<div className="space-y-6">
			<header>
				<p className="island-kicker mb-2">Dashboard</p>
				<h1 className="display-title text-3xl font-bold text-[var(--sea-ink)] sm:text-4xl">
					Overview
				</h1>
				<p className="mt-1 text-[var(--sea-ink-soft)]">
					Secure admin area. Every write is validated and authorised on the server.
				</p>
			</header>

			{isLoading ? (
				<div className="grid gap-4 sm:grid-cols-3" aria-busy="true">
					{[0, 1, 2].map((index) => (
						<div
							key={index}
							className="h-24 animate-pulse rounded-xl border border-[var(--line)] bg-[var(--chip-bg)]"
						/>
					))}
				</div>
			) : (
				<div className={isAdmin ? "grid gap-4 sm:grid-cols-3" : "grid gap-4 sm:grid-cols-2"}>
					<StatCard title="Products" value={products.length} hint={`${lowStock} low on stock`} />
					{isAdmin ? (
						<>
							<StatCard title="Users" value={users.length} hint="Registered accounts" />
							<StatCard
								title="Administrators"
								value={adminCount}
								hint="Full access"
							/>
						</>
					) : (
						<StatCard title="Your role" value="User" hint="Read-only product access" />
					)}
				</div>
			)}

			<div className="grid gap-4 sm:grid-cols-2">
				<Card
					title="Products"
					subtitle={
						isAdmin ? "View, create, edit and delete products." : "Browse the product catalogue."
					}
				>
					<Link
						to="/products"
						className="font-medium text-[var(--sea-ink)] underline underline-offset-4 hover:text-[var(--sea-ink)]"
					>
						Manage products &rarr;
					</Link>
				</Card>
				{isAdmin ? (
					<Card title="Users" subtitle="Manage accounts and roles (administrator only).">
						<Link
							to="/users"
							className="font-medium text-[var(--sea-ink)] underline underline-offset-4 hover:text-[var(--sea-ink)]"
						>
							Manage users &rarr;
						</Link>
					</Card>
				) : (
					<Card title="Your access" subtitle="A user account can browse products but not change them.">
						<span className="text-sm text-[var(--sea-ink-soft)]">
							Ask an administrator for the administrator role to manage products and users.
						</span>
					</Card>
				)}
			</div>

			{productsQuery.isError ? (
				<p className="text-sm text-red-600 dark:text-red-400">
					Failed to load products: {(productsQuery.error as Error).message}
				</p>
			) : null}
			{isAdmin && usersQuery.isError ? (
				<p className="text-sm text-red-600 dark:text-red-400">
					Failed to load users: {(usersQuery.error as Error).message}
				</p>
			) : null}
		</div>
	);
}

function StatCard({
	title,
	value,
	hint,
}: {
	title: string;
	value: number | string;
	hint?: string;
}) {
	return (
		<div className="rounded-xl border border-[var(--line)] bg-[var(--chip-bg)] p-5">
			<p className="m-0 text-sm text-[var(--sea-ink-soft)]">{title}</p>
			<p className="m-0 mt-1 text-3xl font-bold text-[var(--sea-ink)]">{value}</p>
			{hint ? <p className="m-0 mt-1 text-xs text-[var(--sea-ink-soft)]">{hint}</p> : null}
		</div>
	);
}

function Card({
	title,
	subtitle,
	children,
}: {
	title: string;
	subtitle: string;
	children: React.ReactNode;
}) {
	return (
		<div className="rounded-xl border border-[var(--line)] bg-[var(--chip-bg)] p-5">
			<p className="m-0 text-sm font-semibold text-[var(--sea-ink)]">{title}</p>
			<p className="m-0 mt-1 text-xs text-[var(--sea-ink-soft)]">{subtitle}</p>
			<div className="mt-4">{children}</div>
		</div>
	);
}
