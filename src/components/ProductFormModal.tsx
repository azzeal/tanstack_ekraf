import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";

import ProductForm from "@/components/ProductForm";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import type { Product } from "@/lib/db";
import { createProduct, updateProduct } from "@/lib/server/products";

export default function ProductFormModal({
	open,
	onOpenChange,
	product,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	product?: Product;
}) {
	const queryClient = useQueryClient();
	const createFn = useServerFn(createProduct);
	const updateFn = useServerFn(updateProduct);
	const [error, setError] = useState("");

	const isEdit = Boolean(product);

	return (
		<Dialog
			open={open}
			onOpenChange={(next) => {
				setError("");
				onOpenChange(next);
			}}
		>
			<DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
				<DialogHeader>
					<DialogTitle>{isEdit ? "Edit product" : "Add product"}</DialogTitle>
					<DialogDescription>
						{isEdit
							? "Changes are stored immediately on the server."
							: "Name, description, price and stock are required. The image is optional."}
					</DialogDescription>
				</DialogHeader>

				{error ? (
					<p
						role="alert"
						className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400"
					>
						{error}
					</p>
				) : null}

				<ProductForm
					submitLabel={isEdit ? "Save changes" : "Create product"}
					busyLabel={isEdit ? "Saving..." : "Creating..."}
					defaultValues={
						product
							? {
									name: product.name,
									description: product.description,
									price: String(product.price),
									stock: String(product.stock),
									image: product.image ?? "",
								}
							: undefined
					}
					onCancel={() => onOpenChange(false)}
					onSubmit={async (value) => {
						setError("");
						try {
							if (product) {
								await updateFn({ data: { id: product.id, ...value } });
							} else {
								await createFn({ data: value });
							}
							await queryClient.invalidateQueries({ queryKey: ["products"] });
							onOpenChange(false);
						} catch (err) {
							setError(err instanceof Error ? err.message : "Saving failed");
						}
					}}
				/>
			</DialogContent>
		</Dialog>
	);
}
