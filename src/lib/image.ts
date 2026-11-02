/**
 * Shared image helpers.
 *
 * The product image is stored as a data URL on an in-memory product record.
 * The client downscales before upload; the server re-reads the image header so
 * the 512 px rule does not depend on a client that can be modified freely.
 */

export const MAX_IMAGE_SIDE = 512;

/** Data URL cap. A 512 px WebP/JPEG stays well below this; it also bounds memory. */
export const MAX_IMAGE_DATA_URL_LENGTH = 400_000;

export const ALLOWED_IMAGE_MIME = ["image/png", "image/jpeg", "image/webp", "image/gif"] as const;

export type ImageDimensions = { width: number; height: number };

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

export function parseImageDataUrl(dataUrl: string): { mime: string; bytes: Uint8Array } | null {
	const match = /^data:([^;,]+);base64,(.*)$/s.exec(dataUrl);
	if (!match) return null;
	const mime = match[1].toLowerCase();
	if (!(ALLOWED_IMAGE_MIME as readonly string[]).includes(mime)) return null;

	const binary = atob(match[2]);
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i += 1) {
		bytes[i] = binary.charCodeAt(i);
	}
	return { mime, bytes };
}

function readUint16BE(bytes: Uint8Array, offset: number): number {
	return ((bytes[offset] ?? 0) << 8) | (bytes[offset + 1] ?? 0);
}

function readUint16LE(bytes: Uint8Array, offset: number): number {
	return (bytes[offset] ?? 0) | ((bytes[offset + 1] ?? 0) << 8);
}

function readUint24LE(bytes: Uint8Array, offset: number): number {
	return (bytes[offset] ?? 0) | ((bytes[offset + 1] ?? 0) << 8) | ((bytes[offset + 2] ?? 0) << 16);
}

function readPng(bytes: Uint8Array): ImageDimensions | null {
	if (bytes.length < 24) return null;
	for (let i = 0; i < PNG_SIGNATURE.length; i += 1) {
		if (bytes[i] !== PNG_SIGNATURE[i]) return null;
	}
	return {
		width: (readUint16BE(bytes, 16) << 16) | readUint16BE(bytes, 18),
		height: (readUint16BE(bytes, 20) << 16) | readUint16BE(bytes, 22),
	};
}

function readGif(bytes: Uint8Array): ImageDimensions | null {
	if (bytes.length < 10) return null;
	const header = String.fromCharCode(...bytes.slice(0, 4));
	if (header !== "GIF8") return null;
	return { width: readUint16LE(bytes, 6), height: readUint16LE(bytes, 8) };
}

function readJpeg(bytes: Uint8Array): ImageDimensions | null {
	if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;
	let offset = 2;
	while (offset + 9 < bytes.length) {
		if (bytes[offset] !== 0xff) {
			offset += 1;
			continue;
		}
		const marker = bytes[offset + 1] ?? 0;
		// SOF0..SOF15 carry the frame size; C4/C8/CC are not SOF markers.
		if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
			return { height: readUint16BE(bytes, offset + 5), width: readUint16BE(bytes, offset + 7) };
		}
		if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
			offset += 2;
			continue;
		}
		const size = readUint16BE(bytes, offset + 2);
		if (size < 2) return null;
		offset += 2 + size;
	}
	return null;
}

function readWebp(bytes: Uint8Array): ImageDimensions | null {
	if (bytes.length < 30) return null;
	const riff = String.fromCharCode(...bytes.slice(0, 4));
	const webp = String.fromCharCode(...bytes.slice(8, 12));
	if (riff !== "RIFF" || webp !== "WEBP") return null;

	const chunk = String.fromCharCode(...bytes.slice(12, 16));
	if (chunk === "VP8X") {
		return { width: readUint24LE(bytes, 24) + 1, height: readUint24LE(bytes, 27) + 1 };
	}
	if (chunk === "VP8L") {
		const bits =
			((bytes[21] ?? 0) |
				((bytes[22] ?? 0) << 8) |
				((bytes[23] ?? 0) << 16) |
				((bytes[24] ?? 0) << 24)) >>>
			0;
		return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
	}
	if (chunk === "VP8 ") {
		// Lossy bitstream: 3-byte frame tag, 3-byte start code, then 14-bit sizes.
		if (bytes.length < 30) return null;
		return { width: readUint16LE(bytes, 26) & 0x3fff, height: readUint16LE(bytes, 28) & 0x3fff };
	}
	return null;
}

/** Read width/height straight from the encoded bytes, without decoding pixels. */
export function readImageDimensions(bytes: Uint8Array): ImageDimensions | null {
	return readPng(bytes) ?? readGif(bytes) ?? readJpeg(bytes) ?? readWebp(bytes);
}
