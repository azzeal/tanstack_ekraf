import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { type Product, db } from "@/lib/db";
import {
	ALLOWED_IMAGE_MIME,
	MAX_IMAGE_DATA_URL_LENGTH,
	MAX_IMAGE_SIDE,
	parseImageDataUrl,
	readImageDimensions,
} from "@/lib/image";
import { httpError } from "@/lib/server/http-error";
import { requireAdmin, requireAuth } from "@/lib/session";

// `.strict()` rejects unknown fields: the client is untrusted, so a payload
// carrying extra keys (e.g. an injected `id` or `createdAt`) fails loudly
// instead of being silently coerced.
export const productSchema = z
	.object({
		name: z.string().min(1, "Name is required").max(200, "Name is too long"),
		description: z.string().min(1, "Description is required").max(2000, "Description is too long"),
		price: z.coerce.number().min(0, "Price must be positive"),
		stock: z.coerce.number().min(0, "Stock must be positive"),
		image: z.string().optional(),
	})
	.strict();

/**
 * Server-side image check. The client downscales before upload, but the client
 * is untrusted: the type, size and real pixel dimensions are re-read from the
 * encoded bytes here.
 */
function validateProductImage(image: string | undefined): string | undefined {
	if (!image) return undefined;

	if (image.length > MAX_IMAGE_DATA_URL_LENGTH) {
		throw httpError(413, `Image is too large (limit ${MAX_IMAGE_DATA_URL_LENGTH} characters)`);
	}

	const parsed = parseImageDataUrl(image);
	if (!parsed) {
		throw httpError(400, `Image must be a ${ALLOWED_IMAGE_MIME.join(", ")} data URL`);
	}

	const dimensions = readImageDimensions(parsed.bytes);
	if (!dimensions) {
		throw httpError(400, "Could not read the image dimensions");
	}
	if (dimensions.width > MAX_IMAGE_SIDE || dimensions.height > MAX_IMAGE_SIDE) {
		throw httpError(
			400,
			`Image must be at most ${MAX_IMAGE_SIDE} px on its longest side (got ${dimensions.width}×${dimensions.height})`,
		);
	}

	return image;
}

export type ProductInput = z.infer<typeof productSchema>;

// TanStack Start server functions support GET and POST only. Mutations use
// POST and encode the intended action in the validator/body.
export const getProducts = createServerFn({ method: "GET" }).handler(async () => {
	await requireAuth();
	return [...db.product].sort((a, b) => b.createdAt.localeCompare(a.createdAt)) as Product[];
});

export const createProduct = createServerFn({ method: "POST" })
	.validator(productSchema)
	.handler(async ({ data }) => {
		await requireAdmin();
		const image = validateProductImage(data.image);
		const now = new Date().toISOString();
		const product = {
			id: crypto.randomUUID(),
			name: data.name,
			description: data.description,
			price: data.price,
			stock: data.stock,
			image,
			createdAt: now,
			updatedAt: now,
		} as Product;
		db.product.push(product);
		return product;
	});

export const updateProduct = createServerFn({ method: "POST" })
	.validator(
		z
			.object({
				id: z.string(),
				...productSchema.shape,
			})
			.strict(),
	)
	.handler(async ({ data }) => {
		await requireAdmin();
		const index = db.product.findIndex((p) => p.id === data.id);
		if (index === -1) {
			const err = new Error("Product not found") as Error & { status?: number };
			err.status = 404;
			throw err;
		}
		// `image: undefined` means "leave the current image alone"; an empty
		// string means "remove it".
		const image =
			data.image === undefined ? db.product[index].image : validateProductImage(data.image);
		const now = new Date().toISOString();
		const updated = {
			...db.product[index],
			name: data.name,
			description: data.description,
			price: data.price,
			stock: data.stock,
			image,
			updatedAt: now,
		} as Product;
		db.product[index] = updated;
		return updated;
	});

export const deleteProduct = createServerFn({ method: "POST" })
	.validator(z.object({ id: z.string() }).strict())
	.handler(async ({ data }) => {
		await requireAdmin();
		const index = db.product.findIndex((p) => p.id === data.id);
		if (index === -1) {
			const err = new Error("Product not found") as Error & { status?: number };
			err.status = 404;
			throw err;
		}
		db.product.splice(index, 1);
		return { ok: true };
	});
