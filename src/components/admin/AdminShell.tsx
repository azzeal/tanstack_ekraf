import { Link } from "@tanstack/react-router";
import {
	Layers,
	LayoutDashboard,
	Menu,
	Package,
	PanelLeftClose,
	PanelLeftOpen,
	Users,
	X,
} from "lucide-react";
import { type ReactNode, useState } from "react";

import BetterAuthHeader from "@/integrations/better-auth/header-user";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
	{ to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
	{ to: "/products", label: "Products", icon: Package },
	{ to: "/users", label: "Users", icon: Users },
] as const;

type NavItem = (typeof NAV_ITEMS)[number];

// Colour and weight live only in the active/inactive props: Tailwind resolves
// conflicting utilities by stylesheet order, not by the order they appear in
// the class attribute, so duplicating `text-*`/`font-*` in the base class would
// make the active state a coin flip.
const NAV_ITEM_CLASS =
	"flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm no-underline transition-colors hover:bg-[var(--link-bg-hover)] hover:text-[var(--sea-ink)]";
const NAV_ITEM_INACTIVE_CLASS = "font-medium text-[var(--sea-ink-soft)]";
const NAV_ITEM_ACTIVE_CLASS =
	"bg-[var(--link-bg-hover)] font-semibold text-[var(--sea-ink)] shadow-[inset_3px_0_0_0_var(--lagoon)]";

function NavList({ items, onNavigate }: { items: readonly NavItem[]; onNavigate?: () => void }) {
	return (
		<nav className="flex flex-col gap-1 px-3" aria-label="Admin sections">
			{items.map((item) => (
				<NavLink key={item.label} item={item} onNavigate={onNavigate} />
			))}
		</nav>
	);
}

/**
 * A real router link (not a button), so the sidebar navigates, supports
 * middle-click / open-in-new-tab, and reflects the active section. The active
 * className is appended by the router to `className`, which is why both are
 * built from the same base list instead of nesting a span.
 */
function NavLink({
	item: { to, label, icon: Icon },
	collapsed = false,
	onNavigate,
}: {
	item: NavItem;
	collapsed?: boolean;
	onNavigate?: () => void;
}) {
	return (
		<Link
			to={to}
			onClick={onNavigate}
			title={collapsed ? label : undefined}
			aria-label={collapsed ? label : undefined}
			className={cn(NAV_ITEM_CLASS, collapsed && "justify-center px-0")}
			inactiveProps={{ className: NAV_ITEM_INACTIVE_CLASS }}
			activeProps={{
				className: cn(NAV_ITEM_ACTIVE_CLASS, collapsed && "justify-center px-0"),
			}}
		>
			<Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
			{collapsed ? null : label}
		</Link>
	);
}

export default function AdminShell({
	children,
	canManageUsers = true,
}: {
	children: ReactNode;
	/** Regular users may view products but never the users/roles section. */
	canManageUsers?: boolean;
}) {
	const [collapsed, setCollapsed] = useState(false);
	const [mobileOpen, setMobileOpen] = useState(false);
	const navItems = canManageUsers ? NAV_ITEMS : NAV_ITEMS.filter((item) => item.to !== "/users");

	return (
		<div className="flex min-h-[calc(100vh-4rem)] w-full">
			{/* Desktop sidebar */}
			<aside
				className={`sticky top-16 hidden h-[calc(100vh-4rem)] shrink-0 flex-col border-r border-[var(--line)] bg-[var(--header-bg)] transition-[width] duration-200 md:flex ${
					collapsed ? "w-[76px]" : "w-64"
				}`}
			>
				<div className="flex items-center justify-between gap-2 px-4 py-4">
					{collapsed ? null : (
						<span className="island-kicker flex items-center gap-2">
							<Layers className="h-3.5 w-3.5" aria-hidden="true" />
							Ekraf Admin
						</span>
					)}
					<button
						type="button"
						onClick={() => setCollapsed((value) => !value)}
						aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
						className="ml-auto rounded-lg p-2 text-[var(--sea-ink-soft)] transition hover:bg-[var(--link-bg-hover)] hover:text-[var(--sea-ink)]"
					>
						{collapsed ? (
							<PanelLeftOpen className="h-4 w-4" aria-hidden="true" />
						) : (
							<PanelLeftClose className="h-4 w-4" aria-hidden="true" />
						)}
					</button>
				</div>

				{collapsed ? (
					<nav className="flex flex-col items-center gap-1 px-3" aria-label="Admin sections">
						{navItems.map((item) => (
							<NavLink key={item.label} item={item} collapsed />
						))}
					</nav>
				) : (
					<NavList items={navItems} />
				)}
			</aside>

			{/* Mobile drawer trigger */}
			<div className="sticky top-16 z-30 -mb-16 flex w-full items-center gap-2 border-b border-[var(--line)] bg-[var(--header-bg)] px-4 py-2 md:hidden">
				<button
					type="button"
					onClick={() => setMobileOpen(true)}
					aria-label="Open admin menu"
					className="rounded-lg p-2 text-[var(--sea-ink-soft)] transition hover:bg-[var(--link-bg-hover)] hover:text-[var(--sea-ink)]"
				>
					<Menu className="h-5 w-5" aria-hidden="true" />
				</button>
				<span className="island-kicker">Ekraf Admin</span>
				<div className="ml-auto">
					<BetterAuthHeader />
				</div>
			</div>

			{mobileOpen ? (
				<div className="fixed inset-0 z-50 md:hidden">
					<button
						type="button"
						aria-label="Close admin menu"
						className="absolute inset-0 bg-black/40"
						onClick={() => setMobileOpen(false)}
					/>
					<div className="absolute inset-y-0 left-0 flex w-72 flex-col border-r border-[var(--line)] bg-[var(--background)] p-4 shadow-xl">
						<div className="mb-4 flex items-center justify-between">
							<span className="island-kicker">Ekraf Admin</span>
							<button
								type="button"
								onClick={() => setMobileOpen(false)}
								aria-label="Close admin menu"
								className="rounded-lg p-2 text-[var(--sea-ink-soft)] transition hover:bg-[var(--link-bg-hover)]"
							>
								<X className="h-4 w-4" aria-hidden="true" />
							</button>
						</div>
						<NavList items={navItems} onNavigate={() => setMobileOpen(false)} />
					</div>
				</div>
			) : null}

			<main className="min-w-0 flex-1 px-4 py-8 sm:px-6 lg:px-10">{children}</main>
		</div>
	);
}
