import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useCall } from '../call-context'
import { XIcon } from './icons'

const AUTO_DISMISS_MS = 7_000

export function CallErrorToast() {
	const { error, dismissError } = useCall()

	useEffect(() => {
		if (!error) return
		const id = window.setTimeout(dismissError, AUTO_DISMISS_MS)
		return () => window.clearTimeout(id)
	}, [error, dismissError])

	if (!error) return null

	return createPortal(
		<div className='call-toast' role='alert'>
			<span className='call-toast__text'>{error}</span>
			<button
				type='button'
				className='call-toast__close'
				onClick={dismissError}
				aria-label='Закрыть'
			>
				<XIcon />
			</button>
		</div>,
		document.body,
	)
}
