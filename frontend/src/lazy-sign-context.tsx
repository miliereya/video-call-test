import {
	createContext,
	useCallback,
	useContext,
	useMemo,
	useRef,
	useState,
	type ReactNode,
} from 'react'
import { signDownload } from './api/files'

interface LazySignValue {
	urls: Record<string, string>
	requestSign: (key: string) => void
	primeUrls: (next: Record<string, string>) => void
}

const Ctx = createContext<LazySignValue | null>(null)

const BATCH_MS = 200

export function LazySignProvider({ children }: { children: ReactNode }) {
	const [urls, setUrls] = useState<Record<string, string>>({})
	const urlsRef = useRef<Record<string, string>>({})
	const queueRef = useRef<Set<string>>(new Set())
	const timerRef = useRef<number | null>(null)

	urlsRef.current = urls

	const flush = useCallback(async () => {
		const keys = Array.from(queueRef.current)
		queueRef.current.clear()
		timerRef.current = null
		if (keys.length === 0) return
		try {
			const { urls: next } = await signDownload(keys)
			setUrls((prev) => ({ ...prev, ...next }))
		} catch (err) {
			console.error('Lazy signDownload failed', err)
		}
	}, [])

	const requestSign = useCallback(
		(key: string) => {
			if (!key) return
			if (urlsRef.current[key]) return
			if (queueRef.current.has(key)) return
			queueRef.current.add(key)
			if (timerRef.current) return
			timerRef.current = window.setTimeout(() => {
				void flush()
			}, BATCH_MS)
		},
		[flush],
	)

	const primeUrls = useCallback((next: Record<string, string>) => {
		if (Object.keys(next).length === 0) return
		setUrls((prev) => ({ ...prev, ...next }))
	}, [])

	const value = useMemo<LazySignValue>(
		() => ({ urls, requestSign, primeUrls }),
		[urls, requestSign, primeUrls],
	)

	return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useLazySign(): LazySignValue {
	const v = useContext(Ctx)
	if (!v) throw new Error('useLazySign must be used within LazySignProvider')
	return v
}
