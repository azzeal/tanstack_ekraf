import { useForm } from "@tanstack/react-form";
import { ImagePlus, Trash2 } from "lucide-react";
import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MAX_IMAGE_DATA_URL_LENGTH, MAX_IMAGE_SIDE } from "@/lib/image";
import { downscaleImageFile } from "@/lib/image-client";

export type ProductFormValues = {
	name: string;
	description: string;
	price: string;
	stock: string;
	image: string;
};

export type ProductFormSubmit = {
	name: string;
	description: string;
	price: number;
	stock: number;
	image?: string;
};

const emptyValues: ProductFormValues = {
	name: "",
	description: "",
	price: "",
	stock: "",
	image: "",
};

/**
 * Fields are rendered through `form.Field`, which subscribes the render prop to
 * that field's slice of the form store. Reading `form.getFieldValue()` at the
 * top of a component does NOT subscribe: the input was then reset to a stale
 * value on the next re-render, so only the last typed character survived
 * (see NOTES.md).
 */
export default function ProductForm({
	defaultValues,
	submitLabel,
	busyLabel = "Saving...",
	onSubmit,
	onCancel,
}: {
	defaultValues?: ProductFormValues;
	submitLabel: string;
	busyLabel?: string;
	onSubmit: (value: ProductFormSubmit) => Promise<void>;
	onCancel?: () => void;
}) {
	const fileInputRef = useRef<HTMLInputElement>(null);
	const [imageError, setImageError] = useState("");
	const [imageInfo, setImageInfo] = useState("");
	const [processing, setProcessing] = useState(false);

	const form = useForm({
		defaultValues: { ...emptyValues, ...defaultValues },
		onSubmit: async ({ value }) => {
			await onSubmit({
				name: value.name.trim(),
				description: value.description.trim(),
				price: Number(value.price),
				stock: Number(value.stock),
				image: value.image ? value.image : undefined,
			});
		},
	});

	const handleFile = async (file: File | undefined, setImage: (next: string) => void) => {
		if (!file) return;
		setImageError("");
		setImageInfo("");
		if (!file.type.startsWith("image/")) {
			setImageError("Please choose an image file.");
			return;
		}
		setProcessing(true);
		try {
			const result = await downscaleImageFile(file);
			if (result.dataUrl.length > MAX_IMAGE_DATA_URL_LENGTH) {
				setImageError(
					`That image is still too large after resizing (${result.dataUrl.length.toLocaleString()} characters, limit ${MAX_IMAGE_DATA_URL_LENGTH.toLocaleString()}). Try a simpler image.`,
				);
				return;
			}
			setImage(result.dataUrl);
			setImageInfo(`${result.width} × ${result.height} px · ${result.mime}`);
		} catch (err) {
			setImageError(err instanceof Error ? err.message : "Could not process that image.");
		} finally {
			setProcessing(false);
		}
	};

	return (
		<form
			onSubmit={(event) => {
				event.preventDefault();
				event.stopPropagation();
				form.handleSubmit();
			}}
			className="space-y-5"
		>
			<form.Field
				name="name"
				validators={{
					onChange: ({ value }) => (value.trim() ? undefined : "Name is required"),
				}}
			>
				{(field) => (
					<div className="space-y-2">
						<Label htmlFor="product-name">Name</Label>
						<Input
							id="product-name"
							value={field.state.value}
							onChange={(event) => field.handleChange(event.target.value)}
							placeholder="e.g. Starter Kit"
							className="w-full"
							aria-invalid={field.state.meta.errors.length > 0}
						/>
						{field.state.meta.errors[0] ? (
							<p className="text-xs text-red-600 dark:text-red-400">{field.state.meta.errors[0]}</p>
						) : null}
					</div>
				)}
			</form.Field>

			<form.Field
				name="description"
				validators={{
					onChange: ({ value }) => (value.trim() ? undefined : "Description is required"),
				}}
			>
				{(field) => (
					<div className="space-y-2">
						<Label htmlFor="product-description">Description</Label>
						<Input
							id="product-description"
							value={field.state.value}
							onChange={(event) => field.handleChange(event.target.value)}
							placeholder="e.g. Everything you need to begin."
							className="w-full"
							aria-invalid={field.state.meta.errors.length > 0}
						/>
						{field.state.meta.errors[0] ? (
							<p className="text-xs text-red-600 dark:text-red-400">{field.state.meta.errors[0]}</p>
						) : null}
					</div>
				)}
			</form.Field>

			<div className="grid gap-4 sm:grid-cols-2">
				<form.Field
					name="price"
					validators={{
						onChange: ({ value }) => {
							const parsed = Number(value);
							return value.trim() !== "" && Number.isFinite(parsed) && parsed >= 0
								? undefined
								: "Price must be a valid positive number";
						},
					}}
				>
					{(field) => (
						<div className="space-y-2">
							<Label htmlFor="product-price">Price</Label>
							<Input
								id="product-price"
								type="number"
								min={0}
								step="0.01"
								value={field.state.value}
								onChange={(event) => field.handleChange(event.target.value)}
								placeholder="0.00"
								className="w-full"
								aria-invalid={field.state.meta.errors.length > 0}
							/>
							{field.state.meta.errors[0] ? (
								<p className="text-xs text-red-600 dark:text-red-400">
									{field.state.meta.errors[0]}
								</p>
							) : null}
						</div>
					)}
				</form.Field>

				<form.Field
					name="stock"
					validators={{
						onChange: ({ value }) => {
							const parsed = Number(value);
							return value.trim() !== "" && Number.isFinite(parsed) && parsed >= 0
								? undefined
								: "Stock must be a valid positive number";
						},
					}}
				>
					{(field) => (
						<div className="space-y-2">
							<Label htmlFor="product-stock">Stock</Label>
							<Input
								id="product-stock"
								type="number"
								min={0}
								step="1"
								value={field.state.value}
								onChange={(event) => field.handleChange(event.target.value)}
								placeholder="0"
								className="w-full"
								aria-invalid={field.state.meta.errors.length > 0}
							/>
							{field.state.meta.errors[0] ? (
								<p className="text-xs text-red-600 dark:text-red-400">
									{field.state.meta.errors[0]}
								</p>
							) : null}
						</div>
					)}
				</form.Field>
			</div>

			<form.Field name="image">
				{(field) => (
					<div className="space-y-2">
						<Label htmlFor="product-image">Image (optional)</Label>
						<input
							ref={fileInputRef}
							id="product-image"
							type="file"
							accept="image/png,image/jpeg,image/webp,image/gif"
							className="sr-only"
							onChange={(event) => {
								void handleFile(event.target.files?.[0], field.handleChange);
								event.target.value = "";
							}}
						/>
						<div className="flex flex-wrap items-center gap-3">
							{field.state.value ? (
								<img
									src={field.state.value}
									alt="Product preview"
									className="h-20 w-20 rounded-lg border border-[var(--line)] object-cover"
								/>
							) : (
								<div className="flex h-20 w-20 items-center justify-center rounded-lg border border-dashed border-[var(--line)] text-[var(--sea-ink-soft)]">
									<ImagePlus className="h-5 w-5" aria-hidden="true" />
								</div>
							)}
							<div className="flex flex-col gap-2">
								<Button
									type="button"
									variant="outline"
									size="sm"
									disabled={processing}
									onClick={() => fileInputRef.current?.click()}
								>
									{processing
										? "Processing..."
										: field.state.value
											? "Replace image"
											: "Choose image"}
								</Button>
								{field.state.value ? (
									<Button
										type="button"
										variant="ghost"
										size="sm"
										onClick={() => {
											field.handleChange("");
											setImageError("");
											setImageInfo("");
										}}
									>
										<Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
										Remove
									</Button>
								) : null}
							</div>
						</div>
						<p className="text-xs text-[var(--sea-ink-soft)]">
							PNG, JPEG, WebP or GIF. Images are resized so the longest side is at most{" "}
							{MAX_IMAGE_SIDE} px before they are stored.
						</p>
						{imageInfo ? <p className="text-xs text-[var(--sea-ink-soft)]">{imageInfo}</p> : null}
						{imageError ? (
							<p role="alert" className="text-xs text-red-600 dark:text-red-400">
								{imageError}
							</p>
						) : null}
					</div>
				)}
			</form.Field>

			<form.Subscribe selector={(state) => state.isSubmitted && !state.canSubmit}>
				{(isBlocked) =>
					isBlocked ? (
						<p role="alert" className="text-sm text-red-600 dark:text-red-400">
							Please fix the highlighted fields before submitting.
						</p>
					) : null
				}
			</form.Subscribe>

			<form.Subscribe selector={(state) => state.isSubmitting}>
				{(isSubmitting) => (
					<div className="flex flex-col gap-3 pt-4 sm:flex-row sm:justify-end">
						{onCancel ? (
							<Button
								type="button"
								variant="outline"
								onClick={onCancel}
								disabled={isSubmitting}
								className="sm:w-auto"
							>
								Cancel
							</Button>
						) : null}
						<Button type="submit" disabled={isSubmitting || processing} className="sm:w-auto">
							{isSubmitting ? busyLabel : submitLabel}
						</Button>
					</div>
				)}
			</form.Subscribe>
		</form>
	);
}
