import {
	CanActivate,
	ExecutionContext,
	Injectable,
	UnauthorizedException,
} from '@nestjs/common'
import type { Request } from 'express'
import type { SelfUser } from '@global/types'
import { AuthService } from './auth.service'

export interface AuthedRequest extends Request {
	user: SelfUser
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
	constructor(private readonly auth: AuthService) {}

	canActivate(context: ExecutionContext): boolean {
		const req = context.switchToHttp().getRequest<AuthedRequest>()
		const header = req.headers.authorization
		if (!header || !header.startsWith('Bearer ')) {
			throw new UnauthorizedException('Missing bearer token')
		}
		const token = header.slice('Bearer '.length).trim()
		req.user = this.auth.verify(token)
		return true
	}
}
