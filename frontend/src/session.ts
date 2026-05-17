import type { SelfUser } from '@global/types'

const KEY = 'us.session'

export interface Session {
	user: SelfUser
	token: string
	expiresAt: string
}

export function loadSession(): Session | null {
	const raw = localStorage.getItem(KEY)
	if (!raw) return null
	try {
		const parsed = JSON.parse(raw) as Session
		if (new Date(parsed.expiresAt).getTime() <= Date.now()) {
			localStorage.removeItem(KEY)
			return null
		}
		return parsed
	} catch {
		return null
	}
}

export function saveSession(session: Session): void {
	localStorage.setItem(KEY, JSON.stringify(session))
}

export function clearSession(): void {
	localStorage.removeItem(KEY)
}

export function getToken(): string | null {
	return loadSession()?.token ?? null
}
