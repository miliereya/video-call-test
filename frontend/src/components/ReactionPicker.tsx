import { useEffect, useRef } from 'react'
import { QUICK_REACTIONS } from '../data/emojis'

interface Props {
	onPick: (emoji: string) => void
	onClose: () => void
}

export function ReactionPicker({ onPick, onClose }: Props) {
	const ref = useRef<HTMLDivElement>(null)

	useEffect(() => {
		function onDown(e: MouseEvent) {
			if (!ref.current) return
			if (!ref.current.contains(e.target as Node)) onClose()
		}
		document.addEventListener('mousedown', onDown)
		return () => document.removeEventListener('mousedown', onDown)
	}, [onClose])

	return (
		<div ref={ref} className='reaction-picker' role='menu'>
			{QUICK_REACTIONS.map((e) => (
				<button
					key={e}
					type='button'
					className='reaction-picker__item'
					onClick={() => onPick(e)}
				>
					{e}
				</button>
			))}
		</div>
	)
}
