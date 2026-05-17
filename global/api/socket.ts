import type { UserId } from '@global/types'
import type { CallId, CallInvite, CallSignal } from './call'
import type { MessageDto } from './messages'

export const SOCKET_PATH = '/ws'

export interface ServerToClientEvents {
	'message:new': (msg: MessageDto) => void
	'call:invite': (payload: CallInvite) => void
	'call:accepted': (payload: { callId: CallId }) => void
	'call:declined': (payload: { callId: CallId }) => void
	'call:signal': (payload: {
		callId: CallId
		from: UserId
		signal: CallSignal
	}) => void
	'call:hangup': (payload: { callId: CallId; from: UserId }) => void
	'call:unavailable': (payload: { reason: 'offline' | 'busy' }) => void
}

export interface ClientToServerEvents {
	'call:start': (payload: { to: UserId; kind: CallInvite['kind'] }) => void
	'call:accept': (payload: { callId: CallId }) => void
	'call:decline': (payload: { callId: CallId }) => void
	'call:signal': (payload: { callId: CallId; signal: CallSignal }) => void
	'call:hangup': (payload: { callId: CallId }) => void
}
