import type { SelfUser } from '@global/types'

export interface LoginRequest {
	username: string
	password: string
}

export interface LoginResponse {
	user: SelfUser
	token: string
	expiresAt: string
}

export interface MeResponse {
	user: SelfUser
}
