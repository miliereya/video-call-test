import { useEffect, useRef, useState } from 'react'
import { base64ToBytes, decryptToBlob } from './crypto'

interface Args {
	encrypted?: boolean
	src: string
	iv?: string
	mimeType?: string
	key: CryptoKey | null
}

export function useDecryptedUrl({
	encrypted,
	src,
	iv,
	mimeType,
	key,
}: Args): string | null {
	const [url, setUrl] = useState<string | null>(null)
	const urlRef = useRef<string | null>(null)

	useEffect(() => {
		urlRef.current = url
	}, [url])

	useEffect(() => {
		if (!encrypted) {
			setUrl(null)
			return
		}
		if (!key || !src || !iv) {
			setUrl(null)
			return
		}
		let cancelled = false
		;(async () => {
			try {
				const res = await fetch(src)
				if (!res.ok) throw new Error(`fetch ${res.status}`)
				const buf = await res.arrayBuffer()
				const blob = await decryptToBlob(
					key,
					base64ToBytes(iv),
					buf,
					mimeType ?? 'application/octet-stream',
				)
				if (cancelled) return
				const next = URL.createObjectURL(blob)
				setUrl(next)
			} catch (err) {
				console.error('Decryption failed', err)
				if (!cancelled) setUrl(null)
			}
		})()
		return () => {
			cancelled = true
		}
	}, [encrypted, src, iv, mimeType, key])

	useEffect(() => {
		return () => {
			if (urlRef.current) URL.revokeObjectURL(urlRef.current)
		}
	}, [])

	return url
}
