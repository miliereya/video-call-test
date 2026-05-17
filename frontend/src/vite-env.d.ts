/// <reference types="vite/client" />

declare module '*.ogg' {
	const src: string
	export default src
}

declare module '*.ogg?url' {
	const src: string
	export default src
}

interface ImportMetaEnv {
	readonly VITE_BACKEND_URL?: string
	readonly VITE_TURN_URL?: string
	readonly VITE_TURN_USERNAME?: string
	readonly VITE_TURN_CREDENTIAL?: string
	readonly VITE_METERED_DOMAIN?: string
	readonly VITE_METERED_API_KEY?: string
}

interface ImportMeta {
	readonly env: ImportMetaEnv
}
