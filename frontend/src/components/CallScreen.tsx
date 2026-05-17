import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useCall } from '../call-context'
import {
	MicIcon,
	MicOffIcon,
	PhoneOffIcon,
	VideoIcon,
	VideoOffIcon,
} from './icons'

interface Props {
	peerName: string
}

export function CallScreen({ peerName }: Props) {
	const { state, localStream, remoteStream, micOn, camOn, hangup, toggleMic, toggleCam } =
		useCall()
	const localVideoRef = useRef<HTMLVideoElement>(null)
	const remoteVideoRef = useRef<HTMLVideoElement>(null)
	const [elapsed, setElapsed] = useState(0)

	useEffect(() => {
		if (localVideoRef.current && localStream) {
			localVideoRef.current.srcObject = localStream
		}
	}, [localStream])

	useEffect(() => {
		if (remoteVideoRef.current && remoteStream) {
			remoteVideoRef.current.srcObject = remoteStream
		}
	}, [remoteStream])

	useEffect(() => {
		if (state.kind !== 'active') {
			setElapsed(0)
			return
		}
		const tick = () => setElapsed(Math.floor((Date.now() - state.since) / 1000))
		tick()
		const id = window.setInterval(tick, 500)
		return () => window.clearInterval(id)
	}, [state])

	const subtitle =
		state.kind === 'outgoing'
			? 'Звоним…'
			: state.kind === 'active'
				? formatElapsed(elapsed)
				: ''

	return createPortal(
		<div className='call-screen'>
			<div className='call-screen__remote'>
				{remoteStream ? (
					<video ref={remoteVideoRef} autoPlay playsInline />
				) : (
					<div className='call-screen__waiting'>
						<div className='call-screen__avatar'>{peerName[0]}</div>
						<div className='call-screen__peer'>{peerName}</div>
						<div className='call-screen__sub'>{subtitle}</div>
					</div>
				)}
			</div>

			{state.kind === 'active' && remoteStream && (
				<div className='call-screen__topbar'>
					<div className='call-screen__topbar-name'>{peerName}</div>
					<div className='call-screen__topbar-time'>{formatElapsed(elapsed)}</div>
				</div>
			)}

			{localStream && (
				<div className='call-screen__local'>
					<video ref={localVideoRef} autoPlay playsInline muted />
				</div>
			)}

			<div className='call-screen__controls'>
				<button
					type='button'
					className={`call-screen__btn${micOn ? '' : ' call-screen__btn--off'}`}
					onClick={toggleMic}
					aria-label={micOn ? 'Выключить микрофон' : 'Включить микрофон'}
				>
					{micOn ? <MicIcon /> : <MicOffIcon />}
				</button>
				<button
					type='button'
					className='call-screen__btn call-screen__btn--hangup'
					onClick={hangup}
					aria-label='Завершить'
				>
					<PhoneOffIcon />
				</button>
				<button
					type='button'
					className={`call-screen__btn${camOn ? '' : ' call-screen__btn--off'}`}
					onClick={toggleCam}
					aria-label={camOn ? 'Выключить камеру' : 'Включить камеру'}
				>
					{camOn ? <VideoIcon /> : <VideoOffIcon />}
				</button>
			</div>
		</div>,
		document.body,
	)
}

function formatElapsed(sec: number): string {
	const hh = Math.floor(sec / 3600)
	const mm = Math.floor((sec % 3600) / 60)
	const ss = sec % 60
	const m = String(mm).padStart(2, '0')
	const s = String(ss).padStart(2, '0')
	return hh > 0 ? `${hh}:${m}:${s}` : `${m}:${s}`
}
