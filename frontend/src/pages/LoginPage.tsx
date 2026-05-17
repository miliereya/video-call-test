import { useState, type FormEvent } from 'react';
import { login } from '../api/auth';
import { ApiError } from '../api/client';
import type { Session } from '../session';

interface Props {
  onLoggedIn: (session: Session) => void;
}

export function LoginPage({ onLoggedIn }: Props) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const result = await login({ username, password });
      onLoggedIn(result);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setError('Неверный ник или пароль');
      } else {
        setError('Что-то пошло не так. Попробуй ещё раз.');
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login">
      <form className="login__card" onSubmit={handleSubmit}>
        <h1 className="login__title">sexyswag</h1>
        <p className="login__hint">только для бусин</p>

        <label className="field">
          <span>Какая ты попа?</span>
          <input
            type="text"
            autoComplete="username"
            autoFocus
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            disabled={busy}
            required
          />
        </label>

        <label className="field">
          <span>Пароль</span>
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={busy}
            required
          />
        </label>

        {error && <div className="login__error">{error}</div>}

        <button type="submit" className="login__submit" disabled={busy}>
          {busy ? 'Заходим…' : 'Войти'}
        </button>
      </form>
    </div>
  );
}
