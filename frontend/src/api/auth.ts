import { ApiRoutes } from '@global/api/routes'
import type { LoginRequest, LoginResponse, MeResponse } from '@global/api/auth'
import { apiGet, apiPost } from './client'

export function login(req: LoginRequest): Promise<LoginResponse> {
	return apiPost<LoginRequest, LoginResponse>(ApiRoutes.auth.login, req)
}

export function fetchMe(): Promise<MeResponse> {
	return apiGet<MeResponse>(ApiRoutes.auth.me)
}

export function logout(): Promise<void> {
	return apiPost<undefined, void>(ApiRoutes.auth.logout, undefined)
}
