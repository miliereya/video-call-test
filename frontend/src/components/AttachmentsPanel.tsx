import { useEffect, useRef, useState, type MouseEvent } from 'react'
import { createPortal } from 'react-dom'
import { useEncryptionKey } from '../key-context'
import { useLazySign } from '../lazy-sign-context'
import { useDecryptedUrl } from '../use-decrypted-url'
import {
	EyeIcon,
	EyeOffIcon,
	LockIcon,
	PauseIcon,
	PlayIcon,
	XIcon,
} from './icons'
import type { ChatItem } from './MessageBubble'

interface Props {
	items: ChatItem[]
	onClose: () => void
	onOpenMedia: (kind: 'image' | 'video', src: string) => void
}

type Tab = 'media' | 'voice'

type MediaItem = Extract<ChatItem, { kind: 'image' | 'video' }>
type VoiceItem = Extract<ChatItem, { kind: 'voice' }>

export function AttachmentsPanel({ items, onClose, onOpenMedia }: Props) {
	const [tab, setTab] = useState<Tab>('media')

	useEffect(() => {
		const onKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape') onClose()
		}
		document.addEventListener('keydown', onKey)
		return () => document.removeEventListener('keydown', onKey)
	}, [onClose])

	const media = items
		.filter((i): i is MediaItem => i.kind === 'image' || i.kind === 'video')
		.slice()
		.reverse()
	const voice = items
		.filter((i): i is VoiceItem => i.kind === 'voice' && !!i.storageKey)
		.slice()
		.reverse()

	return createPortal(
		<div className='attachments'>
			<header className='attachments__top'>
				<button
					type='button'
					className='chat__icon-btn'
					onClick={onClose}
					aria-label='Закрыть'
				>
					<XIcon />
				</button>
				<div className='attachments__tabs'>
					<button
						type='button'
						className={`attachments__tab${tab === 'media' ? ' attachments__tab--on' : ''}`}
						onClick={() => setTab('media')}
					>
						Медиа{media.length > 0 && ` · ${media.length}`}
					</button>
					<button
						type='button'
						className={`attachments__tab${tab === 'voice' ? ' attachments__tab--on' : ''}`}
						onClick={() => setTab('voice')}
					>
						Голосовые{voice.length > 0 && ` · ${voice.length}`}
					</button>
				</div>
				<div className='attachments__top-spacer' />
			</header>

			{tab === 'media' &&
				(media.length === 0 ? (
					<div className='attachments__empty'>Пока ничего нет</div>
				) : (
					<div className='attachments__grid'>
						{media.map((item) => (
							<MediaTile
								key={item.id}
								item={item}
								onOpen={(src) => onOpenMedia(item.kind, src)}
							/>
						))}
					</div>
				))}

			{tab === 'voice' &&
				(voice.length === 0 ? (
					<div className='attachments__empty'>Пока ничего нет</div>
				) : (
					<div className='attachments__list'>
						{voice.map((item) => (
							<VoiceRow key={item.id} item={item} />
						))}
					</div>
				))}
		</div>,
		document.body,
	)
}

function MediaTile({
	item,
	onOpen,
}: {
	item: MediaItem
	onOpen: (src: string) => void
}) {
	const { key } = useEncryptionKey()
	const { urls, requestSign } = useLazySign()
	const tileRef = useRef<HTMLButtonElement>(null)
	const [revealed, setRevealed] = useState(false)

	const src = item.storageKey ? urls[item.storageKey] ?? '' : ''
	const decryptedUrl = useDecryptedUrl({
		encrypted: item.encrypted,
		src,
		iv: item.iv,
		mimeType: item.mimeType,
		key,
	})
	const effectiveSrc = item.encrypted ? decryptedUrl : src
	const locked = !!item.encrypted && !key
	const hidden = !!item.blurred && !revealed
	const canOpen = !!effectiveSrc && !locked && !hidden
	const showHideBtn = !!item.blurred && revealed && !locked

	useEffect(() => {
		if (!tileRef.current) return
		if (!item.storageKey) return
		const el = tileRef.current
		const obs = new IntersectionObserver(
			([entry]) => {
				if (entry?.isIntersecting) requestSign(item.storageKey)
			},
			{ rootMargin: '300px' },
		)
		obs.observe(el)
		return () => obs.disconnect()
	}, [item.storageKey, requestSign])

	function handleClick() {
		if (locked) return
		if (hidden) {
			setRevealed(true)
			return
		}
		if (effectiveSrc) onOpen(effectiveSrc)
	}

	function handleHide(e: MouseEvent) {
		e.stopPropagation()
		setRevealed(false)
	}

	const cls = [
		'media-tile',
		hidden && 'media-tile--blurred',
		locked && 'media-tile--locked-wrap',
	]
		.filter(Boolean)
		.join(' ')

	return (
		<button
			ref={tileRef}
			type='button'
			className={cls}
			onClick={handleClick}
			disabled={locked}
		>
			{locked ? (
				<div className='media-tile__locked'>
					<LockIcon />
				</div>
			) : item.kind === 'image' ? (
				<div
					className='media-tile__img'
					style={{
						backgroundImage: effectiveSrc ? `url(${effectiveSrc})` : undefined,
					}}
				/>
			) : (
				<div className='media-tile__video'>
					{effectiveSrc && <video src={effectiveSrc} preload='metadata' />}
					{!hidden && (
						<span className='media-tile__play'>
							<PlayIcon />
						</span>
					)}
				</div>
			)}
			{hidden && (
				<span className='media-tile__blur-hint'>
					<EyeIcon />
				</span>
			)}
			{showHideBtn && (
				<span
					className='media-tile__unreveal'
					onClick={handleHide}
					role='button'
					aria-label='Скрыть снова'
				>
					<EyeOffIcon />
				</span>
			)}
		</button>
	)
}

function VoiceRow({ item }: { item: VoiceItem }) {
	const { key } = useEncryptionKey()
	const { urls, requestSign } = useLazySign()
	const audioRef = useRef<HTMLAudioElement | null>(null)
	const wrapRef = useRef<HTMLDivElement | null>(null)
	const [playing, setPlaying] = useState(false)
	const [current, setCurrent] = useState(0)

	const src = item.storageKey ? urls[item.storageKey] ?? '' : ''
	const decryptedUrl = useDecryptedUrl({
		encrypted: item.encrypted,
		src,
		iv: item.iv,
		mimeType: item.mimeType,
		key,
	})
	const effectiveSrc = item.encrypted ? decryptedUrl : src
	const locked = !!item.encrypted && !key
	const loading = !!item.encrypted && !!key && !!item.storageKey && !decryptedUrl
	const canPlay = !!effectiveSrc && !locked

	useEffect(() => {
		if (!wrapRef.current) return
		if (!item.storageKey) return
		const el = wrapRef.current
		const obs = new IntersectionObserver(
			([entry]) => {
				if (entry?.isIntersecting) requestSign(item.storageKey!)
			},
			{ rootMargin: '300px' },
		)
		obs.observe(el)
		return () => obs.disconnect()
	}, [item.storageKey, requestSign])

	function toggle() {
		const a = audioRef.current
		if (!a || !canPlay) return
		if (playing) a.pause()
		else void a.play().catch(() => undefined)
	}

	const ratio =
		item.durationSec > 0 ? Math.min(1, current / item.durationSec) : 0
	const display = playing && current > 0 ? Math.floor(current) : item.durationSec
	const mm = Math.floor(display / 60)
	const ss = String(display % 60).padStart(2, '0')

	return (
		<div
			ref={wrapRef}
			className={`voice-row${item.author === 'me' ? ' voice-row--me' : ''}`}
		>
			<button
				type='button'
				className='voice-row__play'
				onClick={toggle}
				disabled={!canPlay}
				aria-label={playing ? 'Пауза' : 'Играть'}
			>
				{locked ? (
					<LockIcon />
				) : loading ? (
					<span className='spinner spinner--sm' />
				) : playing ? (
					<PauseIcon />
				) : (
					<PlayIcon />
				)}
			</button>
			<div className='voice-row__body'>
				<div className='voice-row__meta'>
					<span>{item.author === 'me' ? 'Я' : 'Партнёр'}</span>
					<span>·</span>
					<span>{item.time}</span>
				</div>
				<div className='voice-row__bar'>
					<div
						className='voice-row__bar-fill'
						style={{ width: `${ratio * 100}%` }}
					/>
				</div>
			</div>
			<span className='voice-row__time'>
				{mm}:{ss}
			</span>
			{effectiveSrc && (
				<audio
					ref={audioRef}
					src={effectiveSrc}
					preload='metadata'
					onPlay={() => setPlaying(true)}
					onPause={() => setPlaying(false)}
					onEnded={() => {
						setPlaying(false)
						setCurrent(0)
					}}
					onTimeUpdate={(e) => setCurrent(e.currentTarget.currentTime)}
				/>
			)}
		</div>
	)
}
