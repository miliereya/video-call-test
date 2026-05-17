import { useEffect, type MouseEvent } from 'react'
import { createPortal } from 'react-dom'
import { XIcon } from './icons'

interface Props {
	src: string
	kind: 'image' | 'video'
	onClose: () => void
}

export function Lightbox({ src, kind, onClose }: Props) {
	useEffect(() => {
		const onKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape') onClose()
		}
		document.addEventListener('keydown', onKey)
		const prevOverflow = document.body.style.overflow
		document.body.style.overflow = 'hidden'
		return () => {
			document.removeEventListener('keydown', onKey)
			document.body.style.overflow = prevOverflow
		}
	}, [onClose])

	function handleBackdropClick(e: MouseEvent) {
		if (e.target === e.currentTarget) onClose()
	}

	return createPortal(
		<div className='lightbox' onClick={handleBackdropClick}>
			<button
				type='button'
				className='lightbox__close'
				onClick={onClose}
				aria-label='Закрыть'
			>
				<XIcon />
			</button>
			{kind === 'image' ? (
				<img className='lightbox__media' src={src} alt='' />
			) : (
				<video
					className='lightbox__media'
					src={src}
					controls
					autoPlay
					playsInline
				/>
			)}
		</div>,
		document.body,
	)
}
