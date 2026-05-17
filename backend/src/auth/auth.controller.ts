import { Body, Controller, Get, HttpCode, Post, UseGuards } from '@nestjs/common'
import type { SelfUser } from '@global/types'
import type { LoginRequest, LoginResponse, MeResponse } from '@global/api/auth'
import { AuthService } from './auth.service'
import { CurrentUser } from './current-user.decorator'
import { JwtAuthGuard } from './jwt-auth.guard'

@Controller('auth')
export class AuthController {
	constructor(private readonly auth: AuthService) {}

	@Post('login')
	@HttpCode(200)
	login(@Body() body: LoginRequest): LoginResponse {
		const user = this.auth.validate(body.username, body.password)
		const { token, expiresAt } = this.auth.sign(user)
		return { user, token, expiresAt: expiresAt.toISOString() }
	}

	@Get('me')
	@UseGuards(JwtAuthGuard)
	me(@CurrentUser() user: SelfUser): MeResponse {
		return { user }
	}

	@Post('logout')
	@HttpCode(204)
	@UseGuards(JwtAuthGuard)
	logout(): void {
		// Stateless JWT — client drops the token. Endpoint exists so the frontend
		// has a clear logout call and we can add a revocation list later without
		// changing the API surface.
	}
}
