const STUN_SERVERS: RTCIceServer[] = [
	{ urls: 'stun:stun.l.google.com:19302' },
	{ urls: 'stun:stun1.l.google.com:19302' },
]

const CACHE_TTL_MS = 6 * 60 * 60 * 1000

let cached: { servers: RTCIceServer[]; at: number } | null = null
let inFlight: Promise<RTCIceServer[]> | null = null

async function fetchFromMetered(
	domain: string,
	apiKey: string,
): Promise<RTCIceServer[]> {
	const res = await fetch(
		`https://${domain}/api/v1/turn/credentials?apiKey=${encodeURIComponent(apiKey)}`,
	)
	if (!res.ok) {
		throw new Error(`Metered TURN ${res.status}`)
	}
	const data = (await res.json()) as RTCIceServer[]
	if (!Array.isArray(data) || data.length === 0) {
		throw new Error('Metered TURN empty')
	}
	return data
}

function staticFromEnv(): RTCIceServer | null {
	const url = import.meta.env.VITE_TURN_URL
	const username = import.meta.env.VITE_TURN_USERNAME
	const credential = import.meta.env.VITE_TURN_CREDENTIAL
	if (!url || !username || !credential) return null
	return {
		urls: url.split(',').map((u) => u.trim()).filter(Boolean),
		username,
		credential,
	}
}

const PUBLIC_FALLBACK: RTCIceServer = {
	urls: [
		'turn:openrelay.metered.ca:80',
		'turn:openrelay.metered.ca:443',
		'turn:openrelay.metered.ca:443?transport=tcp',
	],
	username: 'openrelayproject',
	credential: 'openrelayproject',
}

export async function getIceServers(): Promise<RTCIceServer[]> {
	if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
		return cached.servers
	}
	if (inFlight) return inFlight

	inFlight = (async () => {
		try {
			const apiKey = import.meta.env.VITE_METERED_API_KEY
			const domain = import.meta.env.VITE_METERED_DOMAIN
			if (apiKey && domain) {
				const dynamic = await fetchFromMetered(domain, apiKey)
				const servers = [...STUN_SERVERS, ...dynamic]
				cached = { servers, at: Date.now() }
				return servers
			}
			const stat = staticFromEnv()
			if (stat) {
				const servers = [...STUN_SERVERS, stat]
				cached = { servers, at: Date.now() }
				return servers
			}
			const servers = [...STUN_SERVERS, PUBLIC_FALLBACK]
			cached = { servers, at: Date.now() }
			return servers
		} catch (err) {
			console.warn('TURN fetch failed, falling back', err)
			const stat = staticFromEnv()
			const servers = stat
				? [...STUN_SERVERS, stat]
				: [...STUN_SERVERS, PUBLIC_FALLBACK]
			cached = { servers, at: Date.now() }
			return servers
		} finally {
			inFlight = null
		}
	})()

	return inFlight
}

export function primeIceServers(): void {
	void getIceServers().catch(() => undefined)
}
