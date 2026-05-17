import { Injectable, UnauthorizedException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { JwtService } from '@nestjs/jwt'
import type { SelfUser } from '@global/types'

const ALLOWED_USERNAMES = ['vika', 'danil'] as const
type AllowedUsername = (typeof ALLOWED_USERNAMES)[number]

export interface JwtPayload {
	sub: string
	username: AllowedUsername
}

export interface SignedToken {
	token: string
	expiresAt: Date
}

@Injectable()
export class AuthService {
	constructor(
		private readonly config: ConfigService,
		private readonly jwt: JwtService,
	) {}

	validate(username: string, password: string): SelfUser {
		const normalized = username.trim().toLowerCase()
		if (!this.isAllowed(normalized)) {
			throw new UnauthorizedException('Invalid credentials')
		}

		const expected = this.config.get<string>(
			`USER_${normalized.toUpperCase()}_PASSWORD`,
		)
		if (!expected || expected !== password) {
			throw new UnauthorizedException('Invalid credentials')
		}

		return this.buildUser(normalized)
	}

	sign(user: SelfUser): SignedToken {
		const payload: JwtPayload = {
			sub: user.id,
			username: user.username as AllowedUsername,
		}
		const token = this.jwt.sign(payload)
		const decoded = this.jwt.decode(token) as { exp?: number } | null
		const expSeconds = decoded?.exp ?? Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60
		return { token, expiresAt: new Date(expSeconds * 1000) }
	}

	verify(token: string): SelfUser {
		try {
			const payload = this.jwt.verify<JwtPayload>(token)
			if (!this.isAllowed(payload.username)) {
				throw new UnauthorizedException('Invalid token')
			}
			return this.buildUser(payload.username)
		} catch {
			throw new UnauthorizedException('Invalid token')
		}
	}

	private buildUser(name: AllowedUsername): SelfUser {
		return {
			id: name,
			username: name,
			displayName: name === 'vika' ? 'Vika' : 'Danil',
			publicKey: '',
			email: null,
			createdAt: new Date(0).toISOString(),
		}
	}

	private isAllowed(name: string): name is AllowedUsername {
		return (ALLOWED_USERNAMES as readonly string[]).includes(name)
	}
}
