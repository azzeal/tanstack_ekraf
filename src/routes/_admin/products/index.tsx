import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
	createColumnHelper,
	flexRender,
	rowSortingFeature,
	tableFeatures,
	useTable,
} from "@tanstack/react-table";
import { ImagePlus, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";

import ProductFormModal from "@/components/ProductFormModal";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import type { Product } from "@/lib/db";
import { deleteProduct, getProducts } from "@/lib/server/products";

export const Route = createFileRoute("/_admin/products/")({
	component: Products,
});

function Products() {
	const queryClient = useQueryClient();
	const { viewer } = Route.useRouteContext();
	const isAdmin = viewer.role === "admin";
	const productsQuery = useQuery({
		queryKey: ["products"],
		queryFn: async () => getProducts(),
	});
	const deleteFn = useServerFn(deleteProduct);

	const [formOpen, setFormOpen] = useState(false);
	const [editing, setEditing] = useState<Product | undefined>();
	const [pendingDelete, setPendingDelete] = useState<Product | null>(null);
	const [deleteError, setDeleteError] = useState("");
	const [deleting, setDeleting] = useState(false);

	const features = tableFeatures({ rowSortingFeature });
	const columnHelper = createColumnHelper<typeof features, Product>();

	const columns = columnHelper.columns([
		columnHelper.display({
			id: "image",
			header: "Image",
			cell: (info) => {
				const product = info.row.original as Product;
				return product.image ? (
					<img
						src={product.image}
						alt=""
						className="h-10 w-10 rounded-md border border-[var(--line)] object-cover"
					/>
				) : (
					<span className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-dashed border-[var(--line)] text-[var(--sea-ink-soft)]">
						<ImagePlus className="h-4 w-4" aria-hidden="true" />
					</span>
				);
			},
		}),
		columnHelper.accessor("name", { header: "Name" }),
		columnHelper.accessor("description", {
			header: "Description",
			cell: (info) => <span className="line-clamp-2">{info.getValue()}</span>,
		}),
		columnHelper.accessor("price", {
			header: "Price",
			cell: (info) => `$${Number(info.getValue()).toFixed(2)}`,
		}),
		columnHelper.accessor("stock", {
			header: "Stock",
			cell: (info) => {
				const stock = info.getValue();
				return (
					<span
						className={stock <= 5 ? "font-semibold text-amber-600 dark:text-amber-400" : undefined}
					>
						{stock}
					</span>
				);
			},
		}),
		columnHelper.display({
			id: "actions",
			header: "Actions",
			cell: (info) => {
				const product = info.row.original as Product;
				if (!isAdmin) {
					return <span className="text-xs text-[var(--sea-ink-soft)]">View only</span>;
				}
				return (
					<div className="flex items-center gap-2">
						<Button
							type="button"
							variant="ghost"
							size="sm"
							onClick={() => {
								setEditing(product);
								setFormOpen(true);
							}}
						>
							<Pencil className="h-3.5 w-3.5" aria-hidden="true" />
							Edit
						</Button>
						<Button
							type="button"
							variant="ghost"
							size="sm"
							className="text-red-600 hover:text-red-700 dark:text-red-400"
							onClick={() => setPendingDelete(product)}
						>
							<Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
							Delete
						</Button>
					</div>
				);
			},
		}),
	]);

	const table = useTable({
		features,
		columns,
		data: productsQuery.data ?? [],
	});

	const products = productsQuery.data ?? [];

	const handleDelete = async () => {
		if (!pendingDelete) return;
		setDeleting(true);
		setDeleteError("");
		try {
			await deleteFn({ data: { id: pendingDelete.id } });
			await queryClient.invalidateQueries({ queryKey: ["products"] });
			setPendingDelete(null);
		} catch (err) {
			setDeleteError(err instanceof Error ? err.message : "Delete failed");
		} finally {
			setDeleting(false);
		}
	};

	return (
		<div className="space-y-6">
			<header className="flex flex-wrap items-end justify-between gap-4">
				<div>
					<p className="island-kicker mb-2">Products</p>
					<h1 className="display-title text-3xl font-bold text-[var(--sea-ink)] sm:text-4xl">
						Products
					</h1>
					<p className="mt-1 text-[var(--sea-ink-soft)]">
						TanStack Table + TanStack Query + server functions.{" "}
						{isAdmin ? "Administrator only actions." : "Read-only: your account cannot change products."}
					</p>
				</div>
				{isAdmin ? (
					<Button
						type="button"
						onClick={() => {
							setEditing(undefined);
							setFormOpen(true);
						}}
					>
						<Plus className="h-4 w-4" aria-hidden="true" />
						Add product
					</Button>
				) : null}
			</header>

			{productsQuery.isPending ? (
				<div className="space-y-2" aria-busy="true">
					{[0, 1, 2].map((index) => (
						<div
							key={index}
							className="h-14 animate-pulse rounded-xl border border-[var(--line)] bg-[var(--chip-bg)]"
						/>
					))}
				</div>
			) : productsQuery.isError ? (
				<div className="rounded-xl border border-red-200 bg-red-50 p-5 dark:border-red-800 dark:bg-red-900/20">
					<p className="m-0 text-sm text-red-700 dark:text-red-400">
						Failed to load products: {(productsQuery.error as Error).message}
					</p>
					<Button
						type="button"
						variant="outline"
						size="sm"
						className="mt-3"
						onClick={() => productsQuery.refetch()}
					>
						Try again
					</Button>
				</div>
			) : products.length === 0 ? (
				<div className="rounded-xl border border-dashed border-[var(--line)] bg-[var(--chip-bg)] p-10 text-center">
					<p className="m-0 font-medium text-[var(--sea-ink)]">No products yet</p>
					<p className="mt-1 text-sm text-[var(--sea-ink-soft)]">
						{isAdmin
							? "Create the first product to see it listed here."
							: "An administrator has not added any products yet."}
					</p>
					{isAdmin ? (
						<Button
							type="button"
							className="mt-4"
							onClick={() => {
								setEditing(undefined);
								setFormOpen(true);
							}}
						>
							<Plus className="h-4 w-4" aria-hidden="true" />
							Add product
						</Button>
					) : null}
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
												{header.isPlaceholder ? null : (
													<button
														type="button"
														className="flex items-center gap-1 cursor-pointer select-none"
														onClick={header.column.getToggleSortingHandler()}
													>
														{flexRender(header.column.columnDef.header, header.getContext())}
														{({ asc: " ▲", desc: " ▼" } as Record<string, string>)[
															header.column.getIsSorted() as string
														] ?? null}
													</button>
												)}
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
						{products.map((product) => (
							<li
								key={product.id}
								className="rounded-xl border border-[var(--line)] bg-[var(--chip-bg)] p-4"
							>
								<div className="flex items-start gap-3">
									{product.image ? (
										<img
											src={product.image}
											alt=""
											className="h-12 w-12 rounded-md border border-[var(--line)] object-cover"
										/>
									) : (
										<span className="inline-flex h-12 w-12 items-center justify-center rounded-md border border-dashed border-[var(--line)] text-[var(--sea-ink-soft)]">
											<ImagePlus className="h-4 w-4" aria-hidden="true" />
										</span>
									)}
									<div className="min-w-0 flex-1">
										<p className="m-0 truncate font-semibold text-[var(--sea-ink)]">
											{product.name}
										</p>
										<p className="m-0 mt-0.5 line-clamp-2 text-sm text-[var(--sea-ink-soft)]">
											{product.description}
										</p>
										<p className="m-0 mt-2 text-sm text-[var(--sea-ink)]">
											${product.price.toFixed(2)} · stock {product.stock}
										</p>
									</div>
								</div>
								{isAdmin ? (
									<div className="mt-3 flex gap-2">
										<Button
											type="button"
											variant="outline"
											size="sm"
											className="flex-1"
											onClick={() => {
												setEditing(product);
												setFormOpen(true);
											}}
										>
											<Pencil className="h-3.5 w-3.5" aria-hidden="true" />
											Edit
										</Button>
										<Button
											type="button"
											variant="outline"
											size="sm"
											className="flex-1 text-red-600 hover:text-red-700 dark:text-red-400"
											onClick={() => setPendingDelete(product)}
										>
											<Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
											Delete
										</Button>
									</div>
								) : null}
							</li>
						))}
					</ul>
				</>
			)}

			<ProductFormModal open={formOpen} onOpenChange={setFormOpen} product={editing} />

			<Dialog
				open={Boolean(pendingDelete)}
				onOpenChange={(next) => {
					if (!next) setPendingDelete(null);
				}}
			>
				<DialogContent className="sm:max-w-sm">
					<DialogHeader>
						<DialogTitle>Delete product?</DialogTitle>
						<DialogDescription>
							{pendingDelete ? `“${pendingDelete.name}” will be removed permanently.` : ""}
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
