import { getToken } from '../session'

const BACKEND_URL = (import.meta.env.VITE_BACKEND_URL ?? '').replace(/\/$/, '')

export class ApiError extends Error {
	constructor(
		public status: number,
		message: string,
	) {
		super(message)
	}
}

function buildHeaders(extra?: HeadersInit): Headers {
	const headers = new Headers(extra)
	if (!headers.has('Content-Type')) {
		headers.set('Content-Type', 'application/json')
	}
	const token = getToken()
	if (token && !headers.has('Authorization')) {
		headers.set('Authorization', `Bearer ${token}`)
	}
	return headers
}

async function request<T>(path: string, init: RequestInit): Promise<T> {
	const res = await fetch(`${BACKEND_URL}${path}`, {
		...init,
		headers: buildHeaders(init.headers),
	})
	if (!res.ok) {
		const text = await res.text().catch(() => '')
		throw new ApiError(res.status, text || res.statusText)
	}
	if (res.status === 204 || res.headers.get('Content-Length') === '0') {
		return undefined as T
	}
	return (await res.json()) as T
}

export function apiGet<T>(path: string): Promise<T> {
	return request<T>(path, { method: 'GET' })
}

export function apiPost<TBody, TResponse>(
	path: string,
	body: TBody,
): Promise<TResponse> {
	return request<TResponse>(path, {
		method: 'POST',
		body: JSON.stringify(body),
	})
}
