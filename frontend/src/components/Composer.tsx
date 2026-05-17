import {
	useEffect,
	useRef,
	useState,
	type ChangeEvent,
	type FormEvent,
	type KeyboardEvent,
} from 'react'
import { signUpload, uploadToR2 } from '../api/files'
import { useCall } from '../call-context'
import { bytesToBase64, encryptBlob } from '../crypto'
import { useEncryptionKey } from '../key-context'
import { EmojiPicker } from './EmojiPicker'
import type { ChatItemDraft } from './MessageBubble'
import {
	EyeIcon,
	MicIcon,
	PaperclipIcon,
	PauseIcon,
	PlayIcon,
	SendIcon,
	SmileyIcon,
	StopIcon,
	XIcon,
} from './icons'

interface Props {
	onSend: (item: ChatItemDraft) => void
}

interface StagedFile {
	file: File
	kind: 'image' | 'video'
	previewUrl: string
	blurred: boolean
}

interface StagedVoice {
	blob: Blob
	mimeType: string
	durationSec: number
	previewUrl: string
}

const VOICE_MIME_PREFERENCES = [
	'audio/webm;codecs=opus',
	'audio/webm',
	'audio/mp4',
	'audio/ogg;codecs=opus',
]

function pickVoiceMime(): string {
	if (typeof MediaRecorder === 'undefined') return ''
	for (const m of VOICE_MIME_PREFERENCES) {
		if (MediaRecorder.isTypeSupported(m)) return m
	}
	return ''
}

const TYPING_IDLE_MS = 3000

export function Composer({ onSend }: Props) {
	const { key } = useEncryptionKey()
	const { setMyActivity } = useCall()
	const typingTimerRef = useRef<number | null>(null)
	const [text, setText] = useState('')
	const [recording, setRecording] = useState(false)
	const [elapsed, setElapsed] = useState(0)
	const [staged, setStaged] = useState<StagedFile | null>(null)
	const [stagedVoice, setStagedVoice] = useState<StagedVoice | null>(null)
	const [showEmoji, setShowEmoji] = useState(false)
	const [uploading, setUploading] = useState(false)
	const [progress, setProgress] = useState(0)
	const [error, setError] = useState<string | null>(null)
	const fileInputRef = useRef<HTMLInputElement>(null)
	const textareaRef = useRef<HTMLTextAreaElement>(null)
	const recorderRef = useRef<MediaRecorder | null>(null)
	const chunksRef = useRef<Blob[]>([])
	const streamRef = useRef<MediaStream | null>(null)
	const elapsedRef = useRef(0)

	const hasText = text.trim().length > 0
	const showSend = hasText || staged !== null
	const attachDisabled = uploading || !!staged || !key

	useEffect(() => {
		elapsedRef.current = elapsed
	}, [elapsed])

	useEffect(() => {
		if (!recording) {
			setElapsed(0)
			return
		}
		const started = Date.now()
		const id = window.setInterval(() => {
			setElapsed(Math.floor((Date.now() - started) / 1000))
		}, 250)
		return () => window.clearInterval(id)
	}, [recording])

	useEffect(() => {
		const el = textareaRef.current
		if (!el) return
		el.style.height = 'auto'
		const next = Math.min(el.scrollHeight, 160)
		el.style.height = `${next}px`
		el.style.overflowY = el.scrollHeight > 160 ? 'auto' : 'hidden'
	}, [text])

	useEffect(() => {
		return () => {
			streamRef.current?.getTracks().forEach((t) => t.stop())
			if (typingTimerRef.current) window.clearTimeout(typingTimerRef.current)
			setMyActivity('idle')
		}
	}, [setMyActivity])

	function notifyTyping() {
		setMyActivity('typing')
		if (typingTimerRef.current) window.clearTimeout(typingTimerRef.current)
		typingTimerRef.current = window.setTimeout(() => {
			setMyActivity('idle')
		}, TYPING_IDLE_MS)
	}

	function clearTyping() {
		if (typingTimerRef.current) {
			window.clearTimeout(typingTimerRef.current)
			typingTimerRef.current = null
		}
	}

	useEffect(() => {
		const url = stagedVoice?.previewUrl
		if (!url) return
		return () => URL.revokeObjectURL(url)
	}, [stagedVoice?.previewUrl])

	function handleAttachClick() {
		if (attachDisabled) return
		fileInputRef.current?.click()
	}

	function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
		const file = e.target.files?.[0]
		e.target.value = ''
		if (!file) return
		const kind = file.type.startsWith('video') ? 'video' : 'image'
		const previewUrl = URL.createObjectURL(file)
		setStaged({ file, kind, previewUrl, blurred: false })
		setError(null)
	}

	function cancelStaged() {
		if (staged) URL.revokeObjectURL(staged.previewUrl)
		setStaged(null)
		setError(null)
	}

	function toggleBlur() {
		if (!staged) return
		setStaged({ ...staged, blurred: !staged.blurred })
	}

	async function submitStaged(): Promise<void> {
		if (!staged) return
		if (!key) {
			setError('Введите ключ шифрования')
			return
		}
		const caption = text.trim()
		setUploading(true)
		setProgress(0)
		setError(null)
		clearTyping()
		setMyActivity('uploading')
		try {
			const mimeType =
				staged.file.type ||
				(staged.kind === 'video' ? 'video/mp4' : 'image/jpeg')
			const { iv, ciphertext } = await encryptBlob(key, staged.file)
			const cipherBlob = new Blob([ciphertext], {
				type: 'application/octet-stream',
			})
			const {
				key: storageKey,
				uploadUrl,
				uploadHeaders,
				downloadUrl,
			} = await signUpload({
				kind: staged.kind,
				mimeType: 'application/octet-stream',
				sizeBytes: cipherBlob.size,
			})
			await uploadToR2(uploadUrl, uploadHeaders, cipherBlob, setProgress)
			onSend({
				kind: staged.kind,
				src: downloadUrl,
				storageKey,
				blurred: staged.blurred || undefined,
				caption: caption || undefined,
				encrypted: true,
				iv: bytesToBase64(iv),
				mimeType,
			})
			URL.revokeObjectURL(staged.previewUrl)
			setStaged(null)
			setText('')
		} catch (err) {
			console.error('Upload failed', err)
			setError('Не удалось загрузить файл')
		} finally {
			setUploading(false)
			setProgress(0)
			setMyActivity('idle')
		}
	}

	function handleSubmit(e: FormEvent) {
		e.preventDefault()
		if (staged) {
			void submitStaged()
			return
		}
		if (!hasText) return
		onSend({ kind: 'text', text: text.trim() })
		setText('')
		clearTyping()
		setMyActivity('idle')
	}

	function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault()
			handleSubmit(e as unknown as FormEvent)
		}
	}

	function insertEmoji(emoji: string) {
		const el = textareaRef.current
		if (!el) {
			setText((t) => t + emoji)
			return
		}
		const start = el.selectionStart ?? text.length
		const end = el.selectionEnd ?? text.length
		const next = text.slice(0, start) + emoji + text.slice(end)
		setText(next)
		requestAnimationFrame(() => {
			if (!textareaRef.current) return
			const pos = start + emoji.length
			textareaRef.current.selectionStart = pos
			textareaRef.current.selectionEnd = pos
			textareaRef.current.focus()
		})
	}

	async function startRecording() {
		if (uploading) return
		if (!key) {
			setError('Сначала введите ключ шифрования (замок в шапке)')
			return
		}
		if (
			typeof navigator === 'undefined' ||
			!navigator.mediaDevices?.getUserMedia
		) {
			setError('Браузер не поддерживает запись с микрофона')
			return
		}
		if (typeof MediaRecorder === 'undefined') {
			setError('Браузер не поддерживает MediaRecorder')
			return
		}
		setError(null)
		try {
			const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
			streamRef.current = stream
			const mime = pickVoiceMime()
			const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined)
			chunksRef.current = []
			recorder.ondataavailable = (e) => {
				if (e.data.size > 0) chunksRef.current.push(e.data)
			}
			recorderRef.current = recorder
			recorder.start()
			setRecording(true)
			clearTyping()
			setMyActivity('recording')
		} catch (err) {
			console.error('Mic error', err)
			const name = (err as Error & { name?: string })?.name
			if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
				setError('Доступ к микрофону запрещён в браузере')
			} else if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
				setError('Микрофон не найден')
			} else {
				setError('Не удалось включить микрофон')
			}
			cleanupRecording()
		}
	}

	function cleanupRecording() {
		streamRef.current?.getTracks().forEach((t) => t.stop())
		streamRef.current = null
		recorderRef.current = null
		chunksRef.current = []
		setRecording(false)
	}

	function cancelRecording() {
		const r = recorderRef.current
		if (r && r.state !== 'inactive') {
			r.ondataavailable = null
			r.onstop = null
			r.stop()
		}
		cleanupRecording()
		setMyActivity('idle')
	}

	async function stopRecording() {
		const recorder = recorderRef.current
		if (!recorder) {
			cleanupRecording()
			return
		}
		const duration = Math.max(1, elapsedRef.current)
		const blob = await new Promise<Blob>((resolve) => {
			recorder.onstop = () => {
				const type = recorder.mimeType || 'audio/webm'
				resolve(new Blob(chunksRef.current, { type }))
			}
			recorder.stop()
		})
		const mimeType = blob.type || 'audio/webm'
		cleanupRecording()
		setMyActivity('idle')

		if (blob.size === 0) return

		const previewUrl = URL.createObjectURL(blob)
		setStagedVoice({ blob, mimeType, durationSec: duration, previewUrl })
	}

	function cancelStagedVoice() {
		setStagedVoice(null)
	}

	async function sendStagedVoice() {
		if (!stagedVoice) return
		if (!key) {
			setError('Введите ключ шифрования')
			return
		}
		setUploading(true)
		setProgress(0)
		setError(null)
		setMyActivity('uploading')
		try {
			const { iv, ciphertext } = await encryptBlob(key, stagedVoice.blob)
			const cipher = new Blob([ciphertext], {
				type: 'application/octet-stream',
			})
			const {
				key: storageKey,
				uploadUrl,
				uploadHeaders,
				downloadUrl,
			} = await signUpload({
				kind: 'voice',
				mimeType: 'application/octet-stream',
				sizeBytes: cipher.size,
			})
			await uploadToR2(uploadUrl, uploadHeaders, cipher, setProgress)
			onSend({
				kind: 'voice',
				durationSec: stagedVoice.durationSec,
				src: downloadUrl,
				storageKey,
				encrypted: true,
				iv: bytesToBase64(iv),
				mimeType: stagedVoice.mimeType,
			})
			setStagedVoice(null)
		} catch (err) {
			console.error('Voice upload failed', err)
			setError('Не удалось загрузить голосовое')
		} finally {
			setUploading(false)
			setProgress(0)
			setMyActivity('idle')
		}
	}

	if (stagedVoice) {
		return (
			<div className='composer-wrap'>
				{error && <div className='composer__error'>{error}</div>}
				<div className='composer composer--voice-preview'>
					<button
						type='button'
						className='composer__icon-btn'
						onClick={cancelStagedVoice}
						disabled={uploading}
						aria-label='Удалить запись'
					>
						<XIcon />
					</button>
					<VoicePreview
						src={stagedVoice.previewUrl}
						durationSec={stagedVoice.durationSec}
					/>
					<button
						type='button'
						className='composer__send'
						onClick={() => void sendStagedVoice()}
						disabled={uploading}
						aria-label='Отправить'
					>
						{uploading ? <span className='spinner' /> : <SendIcon />}
					</button>
				</div>
			</div>
		)
	}

	if (recording) {
		const mm = Math.floor(elapsed / 60)
		const ss = String(elapsed % 60).padStart(2, '0')
		return (
			<div className='composer-wrap'>
				<div className='composer composer--recording'>
					<button
						type='button'
						className='composer__icon-btn'
						onClick={cancelRecording}
						aria-label='Отмена'
					>
						<XIcon />
					</button>
					<div className='composer__rec'>
						<span className='composer__rec-dot' />
						<span>
							Запись… {mm}:{ss}
						</span>
					</div>
					<button
						type='button'
						className='composer__send'
						onClick={() => void stopRecording()}
						aria-label='Стоп'
					>
						<StopIcon />
					</button>
				</div>
			</div>
		)
	}

	const pct = Math.round(progress * 100)
	const attachTitle = !key
		? 'Сначала введите ключ шифрования'
		: 'Прикрепить файл'
	const micTitle = !key
		? 'Сначала введите ключ шифрования'
		: 'Записать голосовое'

	return (
		<div className='composer-wrap'>
			{staged && (
				<div className='staged'>
					<div className='staged__thumb'>
						{staged.kind === 'image' ? (
							<div
								className='staged__thumb-img'
								style={{ backgroundImage: `url(${staged.previewUrl})` }}
							/>
						) : (
							<video src={staged.previewUrl} muted preload='metadata' />
						)}
					</div>
					<div className='staged__info'>
						<div className='staged__name'>{staged.file.name}</div>
						{uploading ? (
							<div className='staged__progress'>
								<div className='staged__progress-bar'>
									<div
										className='staged__progress-fill'
										style={{ width: `${pct}%` }}
									/>
								</div>
								<span className='staged__progress-text'>{pct}%</span>
							</div>
						) : (
							<button
								type='button'
								className={`staged__blur${staged.blurred ? ' staged__blur--on' : ''}`}
								onClick={toggleBlur}
							>
								<EyeIcon />
								<span>{staged.blurred ? 'Размыто' : 'Размыть'}</span>
							</button>
						)}
						{error && <div className='staged__error'>{error}</div>}
					</div>
					<button
						type='button'
						className='composer__icon-btn'
						onClick={cancelStaged}
						disabled={uploading}
						aria-label='Убрать'
					>
						<XIcon />
					</button>
				</div>
			)}

			{!staged && error && <div className='composer__error'>{error}</div>}

			<form className='composer' onSubmit={handleSubmit}>
				<input
					ref={fileInputRef}
					type='file'
					accept='image/*,video/*'
					hidden
					onChange={handleFileChange}
				/>
				<button
					type='button'
					className='composer__icon-btn'
					onClick={handleAttachClick}
					disabled={attachDisabled}
					aria-label='Прикрепить'
					title={attachTitle}
				>
					<PaperclipIcon />
				</button>
				<textarea
					ref={textareaRef}
					className='composer__input'
					value={text}
					onChange={(e) => {
						setText(e.target.value)
						if (e.target.value.trim().length > 0) notifyTyping()
						else {
							clearTyping()
							setMyActivity('idle')
						}
					}}
					onKeyDown={handleKeyDown}
					placeholder={staged ? 'Подпись (необязательно)' : 'Сообщение'}
					rows={1}
					disabled={uploading}
				/>
				<button
					type='button'
					className={`composer__icon-btn${showEmoji ? ' composer__icon-btn--on' : ''}`}
					onClick={() => setShowEmoji((v) => !v)}
					aria-label='Эмодзи'
					title='Эмодзи'
				>
					<SmileyIcon />
				</button>
				{showSend ? (
					<button
						type='submit'
						className='composer__send'
						disabled={uploading}
						aria-label='Отправить'
					>
						{uploading ? <span className='spinner' /> : <SendIcon />}
					</button>
				) : (
					<button
						type='button'
						className='composer__send composer__send--mic'
						onClick={() => void startRecording()}
						disabled={uploading}
						title={micTitle}
						aria-label='Голосовое'
					>
						{uploading ? <span className='spinner' /> : <MicIcon />}
					</button>
				)}
			</form>
			{showEmoji && (
				<EmojiPicker
					onPick={insertEmoji}
					onClose={() => setShowEmoji(false)}
				/>
			)}
		</div>
	)
}

function VoicePreview({
	src,
	durationSec,
}: {
	src: string
	durationSec: number
}) {
	const audioRef = useRef<HTMLAudioElement | null>(null)
	const [playing, setPlaying] = useState(false)
	const [current, setCurrent] = useState(0)

	function togglePlay() {
		const a = audioRef.current
		if (!a) return
		if (playing) a.pause()
		else void a.play().catch(() => undefined)
	}

	const ratio = durationSec > 0 ? Math.min(1, current / durationSec) : 0
	const displaySec = playing && current > 0 ? Math.floor(current) : durationSec
	const mm = Math.floor(displaySec / 60)
	const ss = String(displaySec % 60).padStart(2, '0')
	const bars = 28

	return (
		<div className='voice-preview'>
			<button
				type='button'
				className='voice-preview__play'
				onClick={togglePlay}
				aria-label={playing ? 'Пауза' : 'Играть'}
			>
				{playing ? <PauseIcon /> : <PlayIcon />}
			</button>
			<div className='voice-preview__wave'>
				{Array.from({ length: bars }).map((_, i) => {
					const filled = i / bars < ratio
					return (
						<span
							key={i}
							className={`voice-preview__bar${filled ? ' voice-preview__bar--filled' : ''}`}
							style={{ height: `${20 + Math.abs(Math.sin(i * 1.3)) * 60}%` }}
						/>
					)
				})}
			</div>
			<span className='voice-preview__time'>
				{mm}:{ss}
			</span>
			<audio
				ref={audioRef}
				src={src}
				preload='metadata'
				onPlay={() => setPlaying(true)}
				onPause={() => setPlaying(false)}
				onEnded={() => {
					setPlaying(false)
					setCurrent(0)
				}}
				onTimeUpdate={(e) => setCurrent(e.currentTarget.currentTime)}
			/>
		</div>
	)
}
