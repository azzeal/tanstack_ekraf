import { MAX_IMAGE_SIDE } from "./image";

export type DownscaledImage = {
	dataUrl: string;
	width: number;
	height: number;
	mime: string;
};

function loadImage(file: File): Promise<HTMLImageElement> {
	return new Promise((resolve, reject) => {
		const url = URL.createObjectURL(file);
		const image = new Image();
		image.onload = () => {
			URL.revokeObjectURL(url);
			resolve(image);
		};
		image.onerror = () => {
			URL.revokeObjectURL(url);
			reject(new Error("That file could not be read as an image."));
		};
		image.src = url;
	});
}

function encode(canvas: HTMLCanvasElement): { dataUrl: string; mime: string } {
	const webp = canvas.toDataURL("image/webp", 0.85);
	if (webp.startsWith("data:image/webp")) {
		return { dataUrl: webp, mime: "image/webp" };
	}
	return { dataUrl: canvas.toDataURL("image/jpeg", 0.85), mime: "image/jpeg" };
}

/**
 * Scale an image down so its longest side is at most `maxSide` pixels, then
 * encode it for storage. Upscaling is never applied: an image already within
 * the limit keeps its original resolution (re-encoded at 85% quality).
 */
export async function downscaleImageFile(
	file: File,
	maxSide = MAX_IMAGE_SIDE,
): Promise<DownscaledImage> {
	const image = await loadImage(file);
	const scale = Math.min(1, maxSide / Math.max(image.naturalWidth, image.naturalHeight));
	const width = Math.max(1, Math.round(image.naturalWidth * scale));
	const height = Math.max(1, Math.round(image.naturalHeight * scale));

	const canvas = document.createElement("canvas");
	canvas.width = width;
	canvas.height = height;
	const context = canvas.getContext("2d");
	if (!context) {
		throw new Error("Canvas is not available in this browser.");
	}
	context.drawImage(image, 0, 0, width, height);

	const { dataUrl, mime } = encode(canvas);
	return { dataUrl, width, height, mime };
}
