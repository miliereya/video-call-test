import { useEffect, useRef, useState } from 'react'
import { EMOJI_CATEGORIES } from '../data/emojis'

interface Props {
	onPick: (emoji: string) => void
	onClose: () => void
}

export function EmojiPicker({ onPick, onClose }: Props) {
	const [activeId, setActiveId] = useState(EMOJI_CATEGORIES[0]!.id)
	const ref = useRef<HTMLDivElement>(null)

	useEffect(() => {
		function onDown(e: MouseEvent) {
			if (!ref.current) return
			if (!ref.current.contains(e.target as Node)) onClose()
		}
		document.addEventListener('mousedown', onDown)
		return () => document.removeEventListener('mousedown', onDown)
	}, [onClose])

	useEffect(() => {
		function onKey(e: KeyboardEvent) {
			if (e.key === 'Escape') onClose()
		}
		document.addEventListener('keydown', onKey)
		return () => document.removeEventListener('keydown', onKey)
	}, [onClose])

	const active = EMOJI_CATEGORIES.find((c) => c.id === activeId) ?? EMOJI_CATEGORIES[0]!

	return (
		<div ref={ref} className='emoji-picker' role='dialog' aria-label='Эмодзи'>
			<div className='emoji-picker__tabs'>
				{EMOJI_CATEGORIES.map((cat) => (
					<button
						key={cat.id}
						type='button'
						className={`emoji-picker__tab${cat.id === active.id ? ' emoji-picker__tab--on' : ''}`}
						onClick={() => setActiveId(cat.id)}
						aria-label={cat.id}
					>
						{cat.label}
					</button>
				))}
			</div>
			<div className='emoji-picker__grid'>
				{active.emojis.map((e, i) => (
					<button
						key={`${active.id}-${i}`}
						type='button'
						className='emoji-picker__emoji'
						onClick={() => onPick(e)}
					>
						{e}
					</button>
				))}
			</div>
		</div>
	)
}
