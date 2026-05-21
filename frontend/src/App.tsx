import { useState } from 'react'
import { logout as logoutApi } from './api/auth'
import { CallProvider } from './call-context'
import { KeyProvider } from './key-context'
import { LazySignProvider } from './lazy-sign-context'
import { ChatPage } from './pages/ChatPage'
import { LoginPage } from './pages/LoginPage'
import { clearSession, loadSession, saveSession, type Session } from './session'

export function App() {
	const [session, setSession] = useState<Session | null>(loadSession)

	function handleLoggedIn(next: Session) {
		saveSession(next)
		setSession(next)
	}

	async function handleLogout() {
		try {
			await logoutApi()
		} catch {
			// Local logout proceeds even if the server call fails — token will
			// expire on its own and the client state is the source of truth.
		}
		clearSession()
		setSession(null)
	}

	if (!session) {
		return <LoginPage onLoggedIn={handleLoggedIn} />
	}

	return (
		<KeyProvider>
			<CallProvider token={session.token} currentUserId={session.user.id}>
				<LazySignProvider>
					<ChatPage user={session.user} onLogout={handleLogout} />
				</LazySignProvider>
			</CallProvider>
		</KeyProvider>
	)
}
