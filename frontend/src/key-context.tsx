import {
	createContext,
	useCallback,
	useContext,
	useMemo,
	useState,
	type ReactNode,
} from 'react'
import { deriveKey } from './crypto'

interface KeyContextValue {
	key: CryptoKey | null
	unlock: (passphrase: string) => Promise<void>
	lock: () => void
}

const Ctx = createContext<KeyContextValue | null>(null)

export function KeyProvider({ children }: { children: ReactNode }) {
	const [key, setKey] = useState<CryptoKey | null>(null)

	const unlock = useCallback(async (passphrase: string) => {
		const k = await deriveKey(passphrase)
		setKey(k)
	}, [])

	const lock = useCallback(() => setKey(null), [])

	const value = useMemo(() => ({ key, unlock, lock }), [key, unlock, lock])

	return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useEncryptionKey(): KeyContextValue {
	const v = useContext(Ctx)
	if (!v) throw new Error('useEncryptionKey must be used within KeyProvider')
	return v
}
