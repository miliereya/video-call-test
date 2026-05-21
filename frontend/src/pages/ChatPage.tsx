import {
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
	type UIEvent,
} from 'react'
import type { SelfUser } from '@global/types'
import type {
	MessageDto,
	SendMessagePayload,
} from '@global/api/messages'
import notificationSoundUrl from '../public/audio_2026-05-18_01-32-56.ogg'
import { signDownload } from '../api/files'
import { listMessages, sendMessage, toggleReaction } from '../api/messages'
import { useCall } from '../call-context'
import { AttachmentsPanel } from '../components/AttachmentsPanel'
import { CallErrorToast } from '../components/CallErrorToast'
import { CallScreen } from '../components/CallScreen'
import { Composer } from '../components/Composer'
import {
	GalleryIcon,
	LockIcon,
	LogoutIcon,
	PhoneIcon,
	UnlockIcon,
} from '../components/icons'
import { IncomingCallDialog } from '../components/IncomingCallDialog'
import { KeyDialog } from '../components/KeyDialog'
import { Lightbox } from '../components/Lightbox'
import {
	MessageBubble,
	type ChatItem,
	type ChatItemDraft,
} from '../components/MessageBubble'
import { useEncryptionKey } from '../key-context'
import { useLazySign } from '../lazy-sign-context'

interface Props {
	user: SelfUser
	onLogout: () => void
}

function partnerName(username: string): string {
	return username === 'vika' ? 'Danil' : 'Vika'
}

function partnerStatus(
	activity: 'idle' | 'typing' | 'recording' | 'uploading',
): string {
	switch (activity) {
		case 'typing':
			return 'печатает…'
		case 'recording':
			return 'записывает голосовое…'
		case 'uploading':
			return 'отправляет файл…'
		default:
			return 'в сети'
	}
}

function formatTime(iso: string): string {
	const d = new Date(iso)
	const hh = String(d.getHours()).padStart(2, '0')
	const mm = String(d.getMinutes()).padStart(2, '0')
	return `${hh}:${mm}`
}

function toChatItem(m: MessageDto, currentUserId: string): ChatItem {
	const author = m.senderId === currentUserId ? 'me' : 'them'
	const time = formatTime(m.createdAt)
	const reactions = m.reactions
	switch (m.kind) {
		case 'text':
			return {
				id: m.id,
				author,
				time,
				kind: 'text',
				text: m.text ?? '',
				reactions,
			}
		case 'image':
			return {
				id: m.id,
				author,
				time,
				kind: 'image',
				storageKey: m.attachmentUrl ?? '',
				blurred: m.blurred,
				caption: m.text,
				encrypted: m.encrypted,
				iv: m.attachmentIv,
				mimeType: m.mimeType,
				reactions,
			}
		case 'video':
			return {
				id: m.id,
				author,
				time,
				kind: 'video',
				storageKey: m.attachmentUrl ?? '',
				blurred: m.blurred,
				caption: m.text,
				encrypted: m.encrypted,
				iv: m.attachmentIv,
				mimeType: m.mimeType,
				reactions,
			}
		case 'voice':
			return {
				id: m.id,
				author,
				time,
				kind: 'voice',
				durationSec: m.durationSec ?? 0,
				storageKey: m.attachmentUrl,
				encrypted: m.encrypted,
				iv: m.attachmentIv,
				mimeType: m.mimeType,
				reactions,
			}
		case 'call':
			return {
				id: m.id,
				author,
				time,
				kind: 'call',
				durationSec: m.durationSec ?? 0,
				missed: m.missed,
				reactions,
			}
	}
}

function toPayload(draft: ChatItemDraft): SendMessagePayload {
	switch (draft.kind) {
		case 'text':
			return { kind: 'text', text: draft.text }
		case 'image':
			return {
				kind: 'image',
				attachmentUrl: draft.storageKey,
				attachmentIv: draft.iv,
				mimeType: draft.mimeType,
				blurred: draft.blurred,
				encrypted: draft.encrypted,
				text: draft.caption,
			}
		case 'video':
			return {
				kind: 'video',
				attachmentUrl: draft.storageKey,
				attachmentIv: draft.iv,
				mimeType: draft.mimeType,
				blurred: draft.blurred,
				encrypted: draft.encrypted,
				text: draft.caption,
			}
		case 'voice':
			return {
				kind: 'voice',
				durationSec: draft.durationSec,
				attachmentUrl: draft.storageKey,
				attachmentIv: draft.iv,
				mimeType: draft.mimeType,
				encrypted: draft.encrypted,
			}
		case 'call':
			return {
				kind: 'call',
				durationSec: draft.durationSec,
				missed: draft.missed,
			}
	}
}

function mediaKeysOf(messages: MessageDto[]): string[] {
	const out: string[] = []
	for (const m of messages) {
		if (
			(m.kind === 'image' || m.kind === 'video' || m.kind === 'voice') &&
			m.attachmentUrl
		) {
			out.push(m.attachmentUrl)
		}
	}
	return out
}

interface LightboxState {
	kind: 'image' | 'video'
	src: string
}

const POLL_INTERVAL_MS = 500
const NOTIFICATION_THROTTLE_MS = 2000
const PAGE_SIZE = 100
const INITIAL_MEDIA_SIGN = 15
const SCROLL_TOP_TRIGGER = 120

const notificationAudio =
	typeof Audio !== 'undefined' ? new Audio(notificationSoundUrl) : null
if (notificationAudio) {
	notificationAudio.volume = 0.45
	notificationAudio.preload = 'auto'
}

function playIncomingSound(): void {
	if (!notificationAudio) return
	try {
		notificationAudio.currentTime = 0
		void notificationAudio.play().catch(() => undefined)
	} catch {
		// browser may block until user interaction — ignore
	}
}

export function ChatPage({ user, onLogout }: Props) {
	const { key } = useEncryptionKey()
	const call = useCall()
	const { primeUrls } = useLazySign()

	const [items, setItems] = useState<ChatItem[]>([])
	const [lightbox, setLightbox] = useState<LightboxState | null>(null)
	const [keyDialogOpen, setKeyDialogOpen] = useState(false)
	const [attachmentsOpen, setAttachmentsOpen] = useState(false)
	const [loadingOlder, setLoadingOlder] = useState(false)

	const scrollRef = useRef<HTMLDivElement>(null)
	const itemsRef = useRef<ChatItem[]>([])
	const hasMoreRef = useRef(true)
	const lastItemIdRef = useRef<string | null>(null)
	const lastSoundAtRef = useRef(0)
	const firstLoadRef = useRef(true)
	const loadingOlderRef = useRef(false)

	const partner = useMemo(() => partnerName(user.username), [user.username])

	useEffect(() => {
		itemsRef.current = items
	}, [items])

	useEffect(() => {
		loadingOlderRef.current = loadingOlder
	}, [loadingOlder])

	useEffect(() => {
		let cancelled = false
		let inFlight = false

		async function poll() {
			if (cancelled || inFlight) return
			inFlight = true
			try {
				const { messages, hasMore } = await listMessages({ limit: PAGE_SIZE })
				if (cancelled) return

				const existingIds = new Set(itemsRef.current.map((i) => i.id))
				const incoming = messages.filter((m) => !existingIds.has(m.id))

				if (firstLoadRef.current) {
					hasMoreRef.current = hasMore
					const latestKeys = mediaKeysOf(messages).slice(-INITIAL_MEDIA_SIGN)
					if (latestKeys.length > 0) {
						const { urls } = await signDownload(latestKeys)
						if (cancelled) return
						primeUrls(urls)
					}
					setItems(messages.map((m) => toChatItem(m, user.id)))
					firstLoadRef.current = false
					return
				}

				if (incoming.length === 0) return

				const fromPartner = incoming.some((m) => m.senderId !== user.id)
				const tabHidden = document.visibilityState === 'hidden'
				const now = Date.now()
				if (
					fromPartner &&
					tabHidden &&
					now - lastSoundAtRef.current >= NOTIFICATION_THROTTLE_MS
				) {
					lastSoundAtRef.current = now
					playIncomingSound()
				}

				const incomingKeys = mediaKeysOf(incoming)
				if (incomingKeys.length > 0) {
					const { urls } = await signDownload(incomingKeys)
					if (cancelled) return
					primeUrls(urls)
				}

				setItems((prev) => {
					const have = new Set(prev.map((i) => i.id))
					const stillNew = incoming.filter((m) => !have.has(m.id))
					if (stillNew.length === 0) return prev
					return [...prev, ...stillNew.map((m) => toChatItem(m, user.id))]
				})
			} catch (err) {
				console.error('Poll failed', err)
			} finally {
				inFlight = false
			}
		}

		void poll()
		const interval = window.setInterval(() => void poll(), POLL_INTERVAL_MS)

		return () => {
			cancelled = true
			window.clearInterval(interval)
		}
	}, [user.id, primeUrls])

	useEffect(() => {
		const el = scrollRef.current
		if (!el || items.length === 0) return
		const lastItem = items[items.length - 1]
		if (!lastItem) return
		if (lastItemIdRef.current === lastItem.id) return
		if (lastItemIdRef.current === null) {
			el.scrollTop = el.scrollHeight
		} else {
			const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
			if (distanceFromBottom < 200) el.scrollTop = el.scrollHeight
		}
		lastItemIdRef.current = lastItem.id
	}, [items])

	const loadOlder = useCallback(async () => {
		if (loadingOlderRef.current || !hasMoreRef.current) return
		const oldest = itemsRef.current[0]
		if (!oldest) return
		const el = scrollRef.current
		const prevHeight = el?.scrollHeight ?? 0
		const prevTop = el?.scrollTop ?? 0

		setLoadingOlder(true)
		try {
			const { messages, hasMore } = await listMessages({
				before: oldest.id,
				limit: PAGE_SIZE,
			})
			hasMoreRef.current = hasMore
			if (messages.length === 0) return

			setItems((prev) => {
				const ids = new Set(prev.map((i) => i.id))
				const fresh = messages.filter((m) => !ids.has(m.id))
				if (fresh.length === 0) return prev
				return [...fresh.map((m) => toChatItem(m, user.id)), ...prev]
			})

			requestAnimationFrame(() => {
				const next = scrollRef.current
				if (!next) return
				next.scrollTop = next.scrollHeight - prevHeight + prevTop
			})
		} catch (err) {
			console.error('Load older failed', err)
		} finally {
			setLoadingOlder(false)
		}
	}, [user.id])

	function handleScroll(e: UIEvent<HTMLDivElement>) {
		const el = e.currentTarget
		if (el.scrollTop <= SCROLL_TOP_TRIGGER) {
			void loadOlder()
		}
	}

	async function handleSend(draft: ChatItemDraft) {
		try {
			const { message } = await sendMessage(toPayload(draft))
			if (
				(draft.kind === 'image' ||
					draft.kind === 'video' ||
					draft.kind === 'voice') &&
				draft.storageKey &&
				draft.src
			) {
				primeUrls({ [draft.storageKey]: draft.src })
			}
			setItems((prev) => {
				if (prev.some((p) => p.id === message.id)) return prev
				return [...prev, toChatItem(message, user.id)]
			})
		} catch (err) {
			console.error('Failed to send', err)
		}
	}

	function handleCall() {
		const peerId = user.username === 'vika' ? 'danil' : 'vika'
		void call.startCall(peerId)
	}

	async function handleToggleReaction(messageId: string, emoji: string) {
		try {
			const { message } = await toggleReaction(messageId, emoji)
			setItems((prev) =>
				prev.map((it) =>
					it.id === messageId ? { ...it, reactions: message.reactions } : it,
				),
			)
		} catch (err) {
			console.error('Reaction failed', err)
		}
	}

	const showIncoming = call.state.kind === 'incoming'
	const showCallScreen =
		call.state.kind === 'outgoing' || call.state.kind === 'active'

	return (
		<div className='chat'>
			<header className='chat__header'>
				<div className='chat__peer'>
					<div className='chat__avatar' aria-hidden>
						{partner[0]}
					</div>
					<div className='chat__peer-info'>
						<div className='chat__peer-name'>
							{partner} <span aria-hidden>❤️</span>
						</div>
						<div className='chat__peer-status'>
							{partnerStatus(call.partnerActivity)}
						</div>
					</div>
				</div>
				<div className='chat__actions'>
					<button
						type='button'
						className='chat__icon-btn'
						onClick={() => setAttachmentsOpen(true)}
						aria-label='Вложения'
						title='Вложения'
					>
						<GalleryIcon />
					</button>
					<button
						type='button'
						className={`chat__icon-btn${key ? ' chat__icon-btn--on' : ''}`}
						onClick={() => setKeyDialogOpen(true)}
						aria-label={key ? 'Ключ установлен' : 'Введите ключ'}
						title={key ? 'Ключ установлен' : 'Введите ключ'}
					>
						{key ? <UnlockIcon /> : <LockIcon />}
					</button>
					<button
						type='button'
						className='chat__icon-btn'
						onClick={handleCall}
						aria-label='Позвонить'
					>
						<PhoneIcon />
					</button>
					<button
						type='button'
						className='chat__icon-btn'
						onClick={onLogout}
						aria-label='Выйти'
					>
						<LogoutIcon />
					</button>
				</div>
			</header>

			<div className='chat__list' ref={scrollRef} onScroll={handleScroll}>
				{loadingOlder && (
					<div className='chat__loading-older'>
						<span className='spinner spinner--sm' />
					</div>
				)}
				{items.map((item) => (
					<MessageBubble
						key={item.id}
						item={item}
						currentUserId={user.id}
						onOpenMedia={(kind, src) => setLightbox({ kind, src })}
						onToggleReaction={handleToggleReaction}
					/>
				))}
			</div>

			<Composer onSend={handleSend} />

			{lightbox && (
				<Lightbox
					kind={lightbox.kind}
					src={lightbox.src}
					onClose={() => setLightbox(null)}
				/>
			)}

			{keyDialogOpen && <KeyDialog onClose={() => setKeyDialogOpen(false)} />}

			{attachmentsOpen && (
				<AttachmentsPanel
					items={items}
					onClose={() => setAttachmentsOpen(false)}
					onOpenMedia={(kind, src) => setLightbox({ kind, src })}
				/>
			)}

			{showIncoming && <IncomingCallDialog peerName={partner} />}
			{showCallScreen && <CallScreen peerName={partner} />}

			<CallErrorToast />
		</div>
	)
}
