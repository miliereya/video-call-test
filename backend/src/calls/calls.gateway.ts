import { randomUUID } from 'crypto'
import { Logger } from '@nestjs/common'
import {
	OnGatewayConnection,
	OnGatewayDisconnect,
	SubscribeMessage,
	WebSocketGateway,
	WebSocketServer,
	MessageBody,
	ConnectedSocket,
} from '@nestjs/websockets'
import type { Server, Socket } from 'socket.io'
import type { CallId, CallSignal } from '@global/api/call'
import type {
	ActivityKind,
	ClientToServerEvents,
	ServerToClientEvents,
} from '@global/api/socket'
import { SOCKET_PATH } from '@global/api/socket'
import type { UserId } from '@global/types'
import { AuthService } from '../auth/auth.service'

type ServerType = Server<ClientToServerEvents, ServerToClientEvents>
type SocketType = Socket<ClientToServerEvents, ServerToClientEvents>

interface CallRecord {
	callId: CallId
	caller: UserId
	callee: UserId
}

@WebSocketGateway({
	path: SOCKET_PATH,
	cors: { origin: true, credentials: true },
})
export class CallsGateway implements OnGatewayConnection, OnGatewayDisconnect {
	private readonly logger = new Logger(CallsGateway.name)

	@WebSocketServer()
	server!: ServerType

	private readonly userSockets = new Map<UserId, string>()
	private readonly calls = new Map<CallId, CallRecord>()

	constructor(private readonly auth: AuthService) {}

	handleConnection(client: SocketType): void {
		const token = this.extractToken(client)
		if (!token) {
			client.disconnect(true)
			return
		}
		try {
			const user = this.auth.verify(token)
			client.data.userId = user.id
			this.userSockets.set(user.id, client.id)
			this.logger.log(`User ${user.id} connected (${client.id})`)
		} catch {
			client.disconnect(true)
		}
	}

	handleDisconnect(client: SocketType): void {
		const userId = client.data.userId as UserId | undefined
		if (!userId) return
		if (this.userSockets.get(userId) === client.id) {
			this.userSockets.delete(userId)
		}
		for (const [callId, rec] of this.calls.entries()) {
			if (rec.caller === userId || rec.callee === userId) {
				const otherId = rec.caller === userId ? rec.callee : rec.caller
				const otherSocketId = this.userSockets.get(otherId)
				if (otherSocketId) {
					this.server.to(otherSocketId).emit('call:hangup', {
						callId,
						from: userId,
					})
				}
				this.calls.delete(callId)
			}
		}
		this.broadcastActivity(userId, 'idle')
		this.logger.log(`User ${userId} disconnected`)
	}

	@SubscribeMessage('activity:set')
	onActivitySet(
		@ConnectedSocket() client: SocketType,
		@MessageBody() payload: { activity: ActivityKind },
	): void {
		const from = client.data.userId as UserId | undefined
		if (!from) return
		this.broadcastActivity(from, payload.activity)
	}

	private broadcastActivity(from: UserId, activity: ActivityKind): void {
		for (const [otherId, socketId] of this.userSockets.entries()) {
			if (otherId === from) continue
			this.server.to(socketId).emit('activity:update', { from, activity })
		}
	}

	@SubscribeMessage('call:start')
	onCallStart(
		@ConnectedSocket() client: SocketType,
		@MessageBody() payload: { to: UserId; kind: 'audio' | 'video' },
	): void {
		const from = client.data.userId as UserId | undefined
		if (!from) return
		const targetSocketId = this.userSockets.get(payload.to)
		if (!targetSocketId) {
			client.emit('call:unavailable', { reason: 'offline' })
			return
		}
		const callId = randomUUID()
		this.calls.set(callId, { callId, caller: from, callee: payload.to })
		this.server.to(targetSocketId).emit('call:invite', {
			callId,
			from,
			to: payload.to,
			kind: payload.kind,
			startedAt: new Date().toISOString(),
		})
	}

	@SubscribeMessage('call:accept')
	onCallAccept(
		@ConnectedSocket() client: SocketType,
		@MessageBody() payload: { callId: CallId },
	): void {
		const rec = this.calls.get(payload.callId)
		if (!rec) return
		const callerSocketId = this.userSockets.get(rec.caller)
		if (callerSocketId) {
			this.server
				.to(callerSocketId)
				.emit('call:accepted', { callId: payload.callId })
		}
	}

	@SubscribeMessage('call:decline')
	onCallDecline(
		@ConnectedSocket() client: SocketType,
		@MessageBody() payload: { callId: CallId },
	): void {
		const rec = this.calls.get(payload.callId)
		if (!rec) return
		const callerSocketId = this.userSockets.get(rec.caller)
		if (callerSocketId) {
			this.server
				.to(callerSocketId)
				.emit('call:declined', { callId: payload.callId })
		}
		this.calls.delete(payload.callId)
	}

	@SubscribeMessage('call:signal')
	onCallSignal(
		@ConnectedSocket() client: SocketType,
		@MessageBody() payload: { callId: CallId; signal: CallSignal },
	): void {
		const from = client.data.userId as UserId | undefined
		if (!from) return
		const rec = this.calls.get(payload.callId)
		if (!rec) return
		const otherId = rec.caller === from ? rec.callee : rec.caller
		const otherSocketId = this.userSockets.get(otherId)
		if (otherSocketId) {
			this.server.to(otherSocketId).emit('call:signal', {
				callId: payload.callId,
				from,
				signal: payload.signal,
			})
		}
	}

	@SubscribeMessage('call:hangup')
	onCallHangup(
		@ConnectedSocket() client: SocketType,
		@MessageBody() payload: { callId: CallId },
	): void {
		const from = client.data.userId as UserId | undefined
		if (!from) return
		const rec = this.calls.get(payload.callId)
		if (!rec) return
		const otherId = rec.caller === from ? rec.callee : rec.caller
		const otherSocketId = this.userSockets.get(otherId)
		if (otherSocketId) {
			this.server
				.to(otherSocketId)
				.emit('call:hangup', { callId: payload.callId, from })
		}
		this.calls.delete(payload.callId)
	}

	private extractToken(client: SocketType): string | null {
		const auth = client.handshake.auth as
			| { token?: unknown }
			| undefined
		if (auth && typeof auth.token === 'string') return auth.token
		const header = client.handshake.headers.authorization
		if (header?.startsWith('Bearer ')) return header.slice('Bearer '.length)
		return null
	}
}
