import { useEffect, useState, type FormEvent, type MouseEvent } from 'react'
import { createPortal } from 'react-dom'
import { useEncryptionKey } from '../key-context'
import { XIcon } from './icons'

interface Props {
	onClose: () => void
}

export function KeyDialog({ onClose }: Props) {
	const { key, unlock, lock } = useEncryptionKey()
	const [pass, setPass] = useState('')
	const [busy, setBusy] = useState(false)
	const [error, setError] = useState<string | null>(null)

	useEffect(() => {
		const onKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape') onClose()
		}
		document.addEventListener('keydown', onKey)
		return () => document.removeEventListener('keydown', onKey)
	}, [onClose])

	async function handleSubmit(e: FormEvent) {
		e.preventDefault()
		if (!pass.trim()) return
		setBusy(true)
		setError(null)
		try {
			await unlock(pass)
			onClose()
		} catch (err) {
			console.error(err)
			setError('Не удалось применить ключ')
		} finally {
			setBusy(false)
		}
	}

	function handleLock() {
		lock()
		onClose()
	}

	function handleBackdrop(e: MouseEvent) {
		if (e.target === e.currentTarget) onClose()
	}

	return createPortal(
		<div className='dialog' onClick={handleBackdrop}>
			<form className='dialog__card' onSubmit={handleSubmit}>
				<header className='dialog__header'>
					<h2 className='dialog__title'>Ключ шифрования</h2>
					<button
						type='button'
						className='chat__icon-btn'
						onClick={onClose}
						aria-label='Закрыть'
					>
						<XIcon />
					</button>
				</header>
				<p className='dialog__hint'>
					Общий с партнёром ключ. Файлы шифруются и расшифровываются только в
					браузере — сервер хранит их в виде шифротекста и не может прочитать.
				</p>
				<label className='field'>
					<span>Ключ</span>
					<input
						type='password'
						autoComplete='off'
						autoFocus
						value={pass}
						onChange={(e) => setPass(e.target.value)}
						disabled={busy}
						placeholder={key ? 'Замените на новый' : 'Введите ключ'}
					/>
				</label>
				{error && <div className='dialog__error'>{error}</div>}
				<div className='dialog__actions'>
					{key && (
						<button
							type='button'
							className='dialog__secondary'
							onClick={handleLock}
							disabled={busy}
						>
							Сбросить
						</button>
					)}
					<button
						type='submit'
						className='dialog__primary'
						disabled={busy || !pass.trim()}
					>
						{busy ? 'Применяем…' : 'Применить'}
					</button>
				</div>
			</form>
		</div>,
		document.body,
	)
}
