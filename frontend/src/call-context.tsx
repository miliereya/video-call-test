import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
	type ReactNode,
} from 'react'
import { io, type Socket } from 'socket.io-client'
import type { CallId, CallSignal, IceCandidateInit } from '@global/api/call'
import { SOCKET_PATH } from '@global/api/socket'
import type {
	ClientToServerEvents,
	ServerToClientEvents,
} from '@global/api/socket'
import type { UserId } from '@global/types'

type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>

type CallState =
	| { kind: 'idle' }
	| { kind: 'outgoing'; callId: CallId; to: UserId; since: number }
	| { kind: 'incoming'; callId: CallId; from: UserId; since: number }
	| {
			kind: 'active'
			callId: CallId
			peer: UserId
			role: 'caller' | 'callee'
			since: number
	  }

interface CallControls {
	state: CallState
	error: string | null
	localStream: MediaStream | null
	remoteStream: MediaStream | null
	micOn: boolean
	camOn: boolean
	startCall: (to: UserId) => Promise<void>
	acceptCall: () => Promise<void>
	declineCall: () => void
	hangup: () => void
	toggleMic: () => void
	toggleCam: () => void
	dismissError: () => void
}

function getMediaErrorMessage(err: unknown): string {
	const name = (err as Error & { name?: string })?.name
	switch (name) {
		case 'NotAllowedError':
		case 'PermissionDeniedError':
			return 'Доступ к камере и микрофону запрещён в браузере'
		case 'NotFoundError':
		case 'DevicesNotFoundError':
			return 'Камера или микрофон не найдены'
		case 'NotReadableError':
		case 'TrackStartError':
			return 'Камера или микрофон заняты другим приложением'
		case 'OverconstrainedError':
			return 'Камера не поддерживает запрошенные настройки'
		case 'AbortError':
			return 'Доступ к устройству прерван'
		default:
			return 'Не удалось получить камеру/микрофон'
	}
}

const Ctx = createContext<CallControls | null>(null)

const RTC_CONFIG: RTCConfiguration = {
	iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
}

const MEDIA_CONSTRAINTS: MediaStreamConstraints = {
	video: {
		width: { ideal: 1920 },
		height: { ideal: 1080 },
		frameRate: { ideal: 60, min: 24 },
		facingMode: 'user',
	},
	audio: {
		echoCancellation: true,
		noiseSuppression: true,
		autoGainControl: true,
		sampleRate: 48000,
	},
}

const VIDEO_MAX_BITRATE = 8_000_000
const VIDEO_MAX_FRAMERATE = 60

async function applyVideoSenderParams(pc: RTCPeerConnection): Promise<void> {
	for (const sender of pc.getSenders()) {
		if (sender.track?.kind !== 'video') continue
		const params = sender.getParameters()
		const encodings = params.encodings && params.encodings.length > 0
			? params.encodings
			: [{}]
		const first = encodings[0] ?? {}
		first.maxBitrate = VIDEO_MAX_BITRATE
		first.maxFramerate = VIDEO_MAX_FRAMERATE
		encodings[0] = first
		params.encodings = encodings
		try {
			await sender.setParameters(params)
		} catch (err) {
			console.warn('setParameters (video) failed', err)
		}
	}
}

interface ProviderProps {
	token: string
	currentUserId: UserId
	children: ReactNode
}

export function CallProvider({ token, currentUserId, children }: ProviderProps) {
	const [state, setState] = useState<CallState>({ kind: 'idle' })
	const [error, setError] = useState<string | null>(null)
	const [localStream, setLocalStream] = useState<MediaStream | null>(null)
	const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null)
	const [micOn, setMicOn] = useState(true)
	const [camOn, setCamOn] = useState(true)

	const socketRef = useRef<AppSocket | null>(null)
	const pcRef = useRef<RTCPeerConnection | null>(null)
	const pendingCandidatesRef = useRef<IceCandidateInit[]>([])
	const localStreamRef = useRef<MediaStream | null>(null)

	const cleanupCall = useCallback(() => {
		pcRef.current?.close()
		pcRef.current = null
		localStreamRef.current?.getTracks().forEach((t) => t.stop())
		localStreamRef.current = null
		setLocalStream(null)
		setRemoteStream(null)
		setMicOn(true)
		setCamOn(true)
		pendingCandidatesRef.current = []
	}, [])

	const ensurePeerConnection = useCallback(
		(callId: CallId): RTCPeerConnection => {
			if (pcRef.current) return pcRef.current
			const pc = new RTCPeerConnection(RTC_CONFIG)
			pc.onicecandidate = (ev) => {
				if (ev.candidate && socketRef.current) {
					socketRef.current.emit('call:signal', {
						callId,
						signal: {
							type: 'ice',
							candidate: ev.candidate.toJSON() as IceCandidateInit,
						},
					})
				}
			}
			pc.ontrack = (ev) => {
				const [stream] = ev.streams
				if (stream) setRemoteStream(stream)
			}
			pc.onconnectionstatechange = () => {
				if (
					pc.connectionState === 'failed' ||
					pc.connectionState === 'closed'
				) {
					setError('Соединение потеряно')
				}
			}
			pcRef.current = pc
			return pc
		},
		[],
	)

	const addLocalTracks = useCallback(
		(pc: RTCPeerConnection): MediaStream | null => {
			const stream = localStreamRef.current
			if (!stream) return null
			for (const track of stream.getTracks()) {
				pc.addTrack(track, stream)
			}
			return stream
		},
		[],
	)

	const acquireMedia = useCallback(async (): Promise<MediaStream> => {
		let stream: MediaStream
		try {
			stream = await navigator.mediaDevices.getUserMedia(MEDIA_CONSTRAINTS)
		} catch (err) {
			const name = (err as { name?: string })?.name
			const videoSpecific =
				name === 'NotReadableError' ||
				name === 'OverconstrainedError' ||
				name === 'TrackStartError'
			if (!videoSpecific) throw err
			console.warn('Video not available, falling back to audio-only', err)
			stream = await navigator.mediaDevices.getUserMedia({
				audio: MEDIA_CONSTRAINTS.audio,
			})
			setError('Камера занята — звоним без видео')
		}
		localStreamRef.current = stream
		setLocalStream(stream)
		return stream
	}, [])

	const startCall = useCallback(
		async (to: UserId) => {
			if (state.kind !== 'idle') return
			const socket = socketRef.current
			if (!socket) {
				setError('Нет соединения с сервером')
				return
			}
			setError(null)
			try {
				await acquireMedia()
				socket.emit('call:start', { to, kind: 'video' })
				const placeholderCallId = '' as CallId
				setState({
					kind: 'outgoing',
					callId: placeholderCallId,
					to,
					since: Date.now(),
				})
			} catch (err) {
				console.error('Failed to start call', err)
				setError(getMediaErrorMessage(err))
				cleanupCall()
			}
		},
		[state.kind, acquireMedia, cleanupCall],
	)

	const acceptCall = useCallback(async () => {
		if (state.kind !== 'incoming') return
		const socket = socketRef.current
		if (!socket) return
		try {
			await acquireMedia()
			socket.emit('call:accept', { callId: state.callId })
			setState({
				kind: 'active',
				callId: state.callId,
				peer: state.from,
				role: 'callee',
				since: Date.now(),
			})
		} catch (err) {
			console.error('Failed to accept call', err)
			setError(getMediaErrorMessage(err))
			socket.emit('call:decline', { callId: state.callId })
			cleanupCall()
			setState({ kind: 'idle' })
		}
	}, [state, acquireMedia, cleanupCall])

	const declineCall = useCallback(() => {
		if (state.kind !== 'incoming') return
		socketRef.current?.emit('call:decline', { callId: state.callId })
		cleanupCall()
		setState({ kind: 'idle' })
	}, [state, cleanupCall])

	const hangup = useCallback(() => {
		const s = state
		if (s.kind === 'idle') return
		const callId =
			s.kind === 'active' || s.kind === 'outgoing' || s.kind === 'incoming'
				? s.callId
				: null
		if (callId) {
			socketRef.current?.emit('call:hangup', { callId })
		}
		cleanupCall()
		setState({ kind: 'idle' })
	}, [state, cleanupCall])

	const toggleMic = useCallback(() => {
		const stream = localStreamRef.current
		if (!stream) return
		const next = !micOn
		stream.getAudioTracks().forEach((t) => (t.enabled = next))
		setMicOn(next)
	}, [micOn])

	const toggleCam = useCallback(() => {
		const stream = localStreamRef.current
		if (!stream) return
		const next = !camOn
		stream.getVideoTracks().forEach((t) => (t.enabled = next))
		setCamOn(next)
	}, [camOn])

	const dismissError = useCallback(() => setError(null), [])

	useEffect(() => {
		const backendUrl = (import.meta.env.VITE_BACKEND_URL ?? '').replace(
			/\/$/,
			'',
		)
		const socket: AppSocket = io(backendUrl || undefined, {
			path: SOCKET_PATH,
			auth: { token },
			transports: ['websocket', 'polling'],
		})
		socketRef.current = socket

		socket.on('connect_error', (err) => {
			console.error('Socket error', err)
		})

		socket.on('call:invite', (invite) => {
			if (pcRef.current || state.kind !== 'idle') {
				socket.emit('call:decline', { callId: invite.callId })
				return
			}
			setState({
				kind: 'incoming',
				callId: invite.callId,
				from: invite.from,
				since: Date.now(),
			})
		})

		socket.on('call:accepted', async ({ callId }) => {
			setState((prev) =>
				prev.kind === 'outgoing'
					? {
							kind: 'active',
							callId,
							peer: prev.to,
							role: 'caller',
							since: Date.now(),
						}
					: prev,
			)
			try {
				const pc = ensurePeerConnection(callId)
				addLocalTracks(pc)
				const offer = await pc.createOffer()
				await pc.setLocalDescription(offer)
				await applyVideoSenderParams(pc)
				socket.emit('call:signal', {
					callId,
					signal: { type: 'offer', sdp: offer.sdp ?? '' },
				})
			} catch (err) {
				console.error('Failed to create offer', err)
				setError('Не удалось установить связь')
				cleanupCall()
				setState({ kind: 'idle' })
			}
		})

		socket.on('call:declined', () => {
			setError('Звонок отклонён')
			cleanupCall()
			setState({ kind: 'idle' })
		})

		socket.on('call:hangup', () => {
			cleanupCall()
			setState({ kind: 'idle' })
		})

		socket.on('call:unavailable', () => {
			setError('Партнёр не в сети')
			cleanupCall()
			setState({ kind: 'idle' })
		})

		socket.on('call:signal', async ({ callId, signal }) => {
			try {
				const pc = ensurePeerConnection(callId)
				if (signal.type === 'offer') {
					addLocalTracks(pc)
					await pc.setRemoteDescription({ type: 'offer', sdp: signal.sdp })
					for (const c of pendingCandidatesRef.current) {
						await pc.addIceCandidate(c)
					}
					pendingCandidatesRef.current = []
					const answer = await pc.createAnswer()
					await pc.setLocalDescription(answer)
					await applyVideoSenderParams(pc)
					socket.emit('call:signal', {
						callId,
						signal: { type: 'answer', sdp: answer.sdp ?? '' },
					})
				} else if (signal.type === 'answer') {
					await pc.setRemoteDescription({ type: 'answer', sdp: signal.sdp })
					for (const c of pendingCandidatesRef.current) {
						await pc.addIceCandidate(c)
					}
					pendingCandidatesRef.current = []
				} else if (signal.type === 'ice') {
					if (pc.remoteDescription) {
						await pc.addIceCandidate(signal.candidate)
					} else {
						pendingCandidatesRef.current.push(signal.candidate)
					}
				} else if (signal.type === 'hangup') {
					cleanupCall()
					setState({ kind: 'idle' })
				}
			} catch (err) {
				console.error('Signal handling failed', err)
			}
		})

		return () => {
			socket.disconnect()
			socketRef.current = null
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [token, currentUserId])

	const value = useMemo<CallControls>(
		() => ({
			state,
			error,
			localStream,
			remoteStream,
			micOn,
			camOn,
			startCall,
			acceptCall,
			declineCall,
			hangup,
			toggleMic,
			toggleCam,
			dismissError,
		}),
		[
			state,
			error,
			localStream,
			remoteStream,
			micOn,
			camOn,
			startCall,
			acceptCall,
			declineCall,
			hangup,
			toggleMic,
			toggleCam,
			dismissError,
		],
	)

	return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useCall(): CallControls {
	const v = useContext(Ctx)
	if (!v) throw new Error('useCall must be used within CallProvider')
	return v
}
