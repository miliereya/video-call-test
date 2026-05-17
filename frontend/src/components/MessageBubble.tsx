import { useRef, useState, type MouseEvent } from 'react'
import { useEncryptionKey } from '../key-context'
import { useDecryptedUrl } from '../use-decrypted-url'
import { ReactionPicker } from './ReactionPicker'
import {
	EyeIcon,
	EyeOffIcon,
	LockIcon,
	PauseIcon,
	PhoneIcon,
	PlayIcon,
	SmileyIcon,
} from './icons'

export type Author = 'me' | 'them'

export interface Reaction {
	userId: string
	emoji: string
}

interface BaseItem {
	id: string
	author: Author
	time: string
	reactions?: Reaction[]
}

export type ChatItem =
	| (BaseItem & { kind: 'text'; text: string })
	| (BaseItem & {
			kind: 'image'
			src: string
			storageKey: string
			blurred?: boolean
			caption?: string
			encrypted?: boolean
			iv?: string
			mimeType?: string
	  })
	| (BaseItem & {
			kind: 'video'
			src: string
			storageKey: string
			blurred?: boolean
			caption?: string
			encrypted?: boolean
			iv?: string
			mimeType?: string
	  })
	| (BaseItem & {
			kind: 'voice'
			durationSec: number
			src?: string
			storageKey?: string
			encrypted?: boolean
			iv?: string
			mimeType?: string
	  })
	| (BaseItem & { kind: 'call'; durationSec: number; missed?: boolean })

export type ChatItemDraft = ChatItem extends infer T
	? T extends ChatItem
		? Omit<T, 'id' | 'author' | 'time'>
		: never
	: never

function formatDuration(sec: number): string {
	const m = Math.floor(sec / 60)
	const s = String(sec % 60).padStart(2, '0')
	return `${m}:${s}`
}

interface Props {
	item: ChatItem
	currentUserId: string
	onOpenMedia?: (kind: 'image' | 'video', src: string) => void
	onToggleReaction?: (messageId: string, emoji: string) => void
}

export function MessageBubble({
	item,
	currentUserId,
	onOpenMedia,
	onToggleReaction,
}: Props) {
	const side = item.author === 'me' ? 'msg msg--me' : 'msg msg--them'
	const [pickerOpen, setPickerOpen] = useState(false)

	function handlePick(emoji: string) {
		onToggleReaction?.(item.id, emoji)
		setPickerOpen(false)
	}

	return (
		<div className={side}>
			<div className='msg__bubble-wrap'>
				<button
					type='button'
					className={`msg__react-btn${pickerOpen ? ' msg__react-btn--on' : ''}`}
					onClick={() => setPickerOpen((v) => !v)}
					aria-label='Реакция'
				>
					<SmileyIcon />
				</button>
				{pickerOpen && (
					<div className='msg__picker-wrap'>
						<ReactionPicker
							onPick={handlePick}
							onClose={() => setPickerOpen(false)}
						/>
					</div>
				)}
			<div className='msg__bubble'>
				{item.kind === 'text' && <p className='msg__text'>{item.text}</p>}
				{(item.kind === 'image' || item.kind === 'video') && (
					<>
						<MediaBubble
							kind={item.kind}
							src={item.src}
							blurred={item.blurred}
							encrypted={item.encrypted}
							iv={item.iv}
							mimeType={item.mimeType}
							onOpenMedia={onOpenMedia}
						/>
						{item.caption && (
							<p className='msg__text msg__text--caption'>{item.caption}</p>
						)}
					</>
				)}
				{item.kind === 'voice' && (
					<VoiceBubble
						durationSec={item.durationSec}
						src={item.src}
						storageKey={item.storageKey}
						encrypted={item.encrypted}
						iv={item.iv}
						mimeType={item.mimeType}
					/>
				)}
				{item.kind === 'call' && (
					<CallBubble
						author={item.author}
						durationSec={item.durationSec}
						missed={item.missed}
					/>
				)}
				<time className='msg__time'>{item.time}</time>
			</div>
				{item.reactions && item.reactions.length > 0 && (
					<Reactions
						reactions={item.reactions}
						currentUserId={currentUserId}
						onClick={(emoji) => onToggleReaction?.(item.id, emoji)}
					/>
				)}
			</div>
		</div>
	)
}

function Reactions({
	reactions,
	currentUserId,
	onClick,
}: {
	reactions: Reaction[]
	currentUserId: string
	onClick: (emoji: string) => void
}) {
	const grouped = new Map<string, { count: number; mine: boolean }>()
	for (const r of reactions) {
		const cur = grouped.get(r.emoji) ?? { count: 0, mine: false }
		cur.count += 1
		if (r.userId === currentUserId) cur.mine = true
		grouped.set(r.emoji, cur)
	}
	const entries = Array.from(grouped.entries())
	return (
		<div className='msg__reactions'>
			{entries.map(([emoji, { count, mine }]) => (
				<button
					key={emoji}
					type='button'
					className={`reaction-pill${mine ? ' reaction-pill--mine' : ''}`}
					onClick={() => onClick(emoji)}
				>
					<span>{emoji}</span>
					{count > 1 && (
						<span className='reaction-pill__count'>{count}</span>
					)}
				</button>
			))}
		</div>
	)
}

function MediaBubble({
	kind,
	src,
	blurred,
	encrypted,
	iv,
	mimeType,
	onOpenMedia,
}: {
	kind: 'image' | 'video'
	src: string
	blurred?: boolean
	encrypted?: boolean
	iv?: string
	mimeType?: string
	onOpenMedia?: (kind: 'image' | 'video', src: string) => void
}) {
	const { key } = useEncryptionKey()
	const [revealed, setRevealed] = useState(false)
	const decryptedUrl = useDecryptedUrl({ encrypted, src, iv, mimeType, key })

	const effectiveSrc = encrypted ? decryptedUrl : src
	const locked = !!encrypted && !key
	const decrypting = !!encrypted && !!key && !decryptedUrl && !!src
	const hidden = !!blurred && !revealed
	const showHideBtn = !!blurred && revealed && !locked
	const canOpen = !!effectiveSrc && !hidden && !locked

	function handleClick() {
		if (hidden) {
			setRevealed(true)
			return
		}
		if (canOpen && effectiveSrc) onOpenMedia?.(kind, effectiveSrc)
	}

	function handleHide(e: MouseEvent) {
		e.stopPropagation()
		setRevealed(false)
	}

	const wrapClass = [
		'msg__media-wrap',
		hidden && 'msg__media-wrap--blurred',
		canOpen && 'msg__media-wrap--clickable',
		locked && 'msg__media-wrap--locked',
	]
		.filter(Boolean)
		.join(' ')

	return (
		<div
			className={wrapClass}
			onClick={handleClick}
			role={hidden || canOpen ? 'button' : undefined}
			tabIndex={hidden || canOpen ? 0 : undefined}
		>
			{!locked && kind === 'image' && (
				<div
					className='msg__media msg__media--image'
					style={{
						backgroundImage: effectiveSrc ? `url(${effectiveSrc})` : undefined,
					}}
				/>
			)}
			{!locked && kind === 'video' && (
				<div className='msg__media msg__media--video'>
					{effectiveSrc && <video src={effectiveSrc} preload='metadata' />}
					{!hidden && (
						<span className='msg__play'>
							<PlayIcon />
						</span>
					)}
				</div>
			)}
			{locked && (
				<div className='msg__locked'>
					<LockIcon />
					<span>Введите ключ, чтобы открыть</span>
				</div>
			)}
			{decrypting && !locked && (
				<div className='msg__locked msg__locked--busy'>
					<span className='spinner' />
				</div>
			)}
			{hidden && !locked && (
				<div className='msg__blur-hint'>
					<EyeIcon />
					<span>Нажми, чтобы открыть</span>
				</div>
			)}
			{showHideBtn && (
				<button
					type='button'
					className='msg__unreveal'
					onClick={handleHide}
					aria-label='Скрыть снова'
				>
					<EyeOffIcon />
				</button>
			)}
		</div>
	)
}


function VoiceBubble({
	durationSec,
	src,
	storageKey,
	encrypted,
	iv,
	mimeType,
}: {
	durationSec: number
	src?: string
	storageKey?: string
	encrypted?: boolean
	iv?: string
	mimeType?: string
}) {
	const { key } = useEncryptionKey()
	const audioRef = useRef<HTMLAudioElement | null>(null)
	const [playing, setPlaying] = useState(false)
	const [current, setCurrent] = useState(0)

	const decryptedUrl = useDecryptedUrl({
		encrypted,
		src: src ?? '',
		iv,
		mimeType,
		key,
	})
	const effectiveSrc = encrypted ? decryptedUrl : src
	const locked = !!encrypted && !!storageKey && !key
	const loading = !!encrypted && !!key && !!storageKey && !decryptedUrl
	const canPlay = !!storageKey && !!effectiveSrc

	function togglePlay() {
		const a = audioRef.current
		if (!a || !canPlay) return
		if (playing) a.pause()
		else void a.play().catch(() => undefined)
	}

	const ratio =
		durationSec > 0 ? Math.min(1, current / durationSec) : 0
	const bars = 24
	const display = playing && current > 0 ? Math.floor(current) : durationSec

	return (
		<div className='voice'>
			<button
				type='button'
				className='voice__play'
				onClick={togglePlay}
				disabled={!canPlay || locked || loading}
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
			<div className='voice__wave'>
				{Array.from({ length: bars }).map((_, i) => {
					const filled = i / bars < ratio
					return (
						<span
							key={i}
							className={`voice__bar${filled ? ' voice__bar--filled' : ''}`}
							style={{ height: `${20 + Math.abs(Math.sin(i * 1.3)) * 60}%` }}
						/>
					)
				})}
			</div>
			<span className='voice__time'>{formatDuration(display)}</span>
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

function CallBubble({
	author,
	durationSec,
	missed,
}: {
	author: Author
	durationSec: number
	missed?: boolean
}) {
	const label = missed
		? author === 'me'
			? 'Не дозвонился'
			: 'Пропущенный звонок'
		: author === 'me'
			? 'Исходящий звонок'
			: 'Входящий звонок'

	return (
		<div className={`call${missed ? ' call--missed' : ''}`}>
			<span className='call__icon'>
				<PhoneIcon />
			</span>
			<div className='call__info'>
				<div className='call__title'>{label}</div>
				<div className='call__sub'>{formatDuration(durationSec)}</div>
			</div>
		</div>
	)
}
