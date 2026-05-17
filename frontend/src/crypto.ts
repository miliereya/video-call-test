const SALT = new TextEncoder().encode('lovers-vault-v1')
const ITERATIONS = 200_000
const KEY_LENGTH = 256
const IV_LENGTH = 12

export async function deriveKey(passphrase: string): Promise<CryptoKey> {
	const material = await crypto.subtle.importKey(
		'raw',
		new TextEncoder().encode(passphrase),
		{ name: 'PBKDF2' },
		false,
		['deriveKey'],
	)
	return crypto.subtle.deriveKey(
		{ name: 'PBKDF2', salt: SALT, iterations: ITERATIONS, hash: 'SHA-256' },
		material,
		{ name: 'AES-GCM', length: KEY_LENGTH },
		false,
		['encrypt', 'decrypt'],
	)
}

export async function encryptBlob(
	key: CryptoKey,
	blob: Blob,
): Promise<{ iv: Uint8Array; ciphertext: ArrayBuffer }> {
	const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH))
	const plaintext = await blob.arrayBuffer()
	const ciphertext = await crypto.subtle.encrypt(
		{ name: 'AES-GCM', iv },
		key,
		plaintext,
	)
	return { iv, ciphertext }
}

export async function decryptToBlob(
	key: CryptoKey,
	iv: Uint8Array,
	ciphertext: ArrayBuffer,
	mimeType: string,
): Promise<Blob> {
	const plaintext = await crypto.subtle.decrypt(
		{ name: 'AES-GCM', iv: iv as BufferSource },
		key,
		ciphertext,
	)
	return new Blob([plaintext], { type: mimeType })
}

export function bytesToBase64(bytes: ArrayBuffer | Uint8Array): string {
	const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)
	let str = ''
	for (let i = 0; i < arr.length; i++) {
		str += String.fromCharCode(arr[i]!)
	}
	return btoa(str)
}

export function base64ToBytes(str: string): Uint8Array {
	const bin = atob(str)
	const arr = new Uint8Array(bin.length)
	for (let i = 0; i < bin.length; i++) {
		arr[i] = bin.charCodeAt(i)
	}
	return arr
}
