import { createPortal } from 'react-dom'
import { useCall } from '../call-context'
import { PhoneIcon, PhoneOffIcon } from './icons'

interface Props {
	peerName: string
}

export function IncomingCallDialog({ peerName }: Props) {
	const { acceptCall, declineCall } = useCall()

	return createPortal(
		<div className='incoming'>
			<div className='incoming__card'>
				<div className='incoming__avatar'>{peerName[0]}</div>
				<div className='incoming__name'>{peerName}</div>
				<div className='incoming__sub'>входящий звонок…</div>
				<div className='incoming__actions'>
					<button
						type='button'
						className='incoming__btn incoming__btn--decline'
						onClick={declineCall}
						aria-label='Отклонить'
					>
						<PhoneOffIcon />
					</button>
					<button
						type='button'
						className='incoming__btn incoming__btn--accept'
						onClick={() => void acceptCall()}
						aria-label='Принять'
					>
						<PhoneIcon />
					</button>
				</div>
			</div>
		</div>,
		document.body,
	)
}
