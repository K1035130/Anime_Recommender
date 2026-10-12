import { useState } from 'react'
import { errorText } from './errors'
import { useI18n } from './i18n-context'
import { useSession } from './session-context'

// 英文界面下按状态码给的专属提示（后端 detail 是中文，见 errors.ts）。
const EN_ERRORS = {
  login: { 401: 'Incorrect username or password' },
  register: {
    409: 'That username is already taken',
    422: 'Username must be 2–20 characters (letters, digits, Chinese, _ or -); password at least 8 characters',
  },
}

type Mode = 'login' | 'register'

export default function AuthDialog({
  onClose,
  initialMode = 'login',
  hint,
}: {
  onClose: () => void
  initialMode?: Mode
  hint?: string
}) {
  const { login, register, answered } = useSession()
  const [mode, setMode] = useState<Mode>(initialMode)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { lang, t } = useI18n()

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      if (mode === 'login') await login(username.trim(), password)
      else await register(username.trim(), password)
      onClose()
    } catch (err) {
      setError(errorText(err, lang, EN_ERRORS[mode]))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onClick={onClose}
    >
      <form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-2xl border border-(--color-line) bg-(--color-surface) p-6"
      >
        <div className="mb-1 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{mode === 'login' ? t.auth.login : t.auth.register}</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-(--color-muted) hover:text-(--color-ink)"
          >
            {t.auth.close}
          </button>
        </div>

        <p className="mb-4 text-xs leading-relaxed text-(--color-muted)">
          {hint ?? t.auth.hintDefault}
          {answered > 0 && (
            <>
              <br />
              {t.auth.localRatings(answered)}
              {mode === 'register' ? t.auth.mergeRegister : t.auth.mergeLogin}
            </>
          )}
        </p>

        {error && (
          <div className="mb-3 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs">
            {error}
          </div>
        )}

        <label className="mb-3 block">
          <span className="mb-1 block text-xs text-(--color-muted)">
            {t.auth.username}{mode === 'register' && t.auth.usernameRule}
          </span>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            maxLength={20}
            // ⚠️ 用 username 而不是 email —— 浏览器/密码管理器靠这个值决定
            //    自动填什么，写错的话它会往用户名框里填邮箱。
            autoComplete="username"
            className="w-full rounded-lg border border-(--color-line) bg-(--color-page) px-3 py-2 text-sm outline-none focus:border-(--color-brand)"
          />
        </label>

        <label className="mb-4 block">
          <span className="mb-1 block text-xs text-(--color-muted)">
            {t.auth.password}{mode === 'register' && t.auth.passwordRule}
          </span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={mode === 'register' ? 8 : undefined}
            autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
            className="w-full rounded-lg border border-(--color-line) bg-(--color-page) px-3 py-2 text-sm outline-none focus:border-(--color-brand)"
          />
        </label>

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-lg bg-(--color-brand) px-4 py-2 text-sm font-medium text-(--color-on-brand) disabled:opacity-40"
        >
          {busy ? t.auth.busy : mode === 'login' ? t.auth.login : t.auth.register}
        </button>

        <button
          type="button"
          onClick={() => {
            setMode(mode === 'login' ? 'register' : 'login')
            setError(null)
          }}
          className="mt-3 w-full text-center text-xs text-(--color-muted) underline"
        >
          {mode === 'login' ? t.auth.toRegister : t.auth.toLogin}
        </button>

        <p className="mt-4 text-[11px] leading-relaxed text-(--color-muted)">
          {t.auth.privacy}
          <br />
          {t.auth.noRecoveryPre}<strong>{t.auth.noRecoveryStrong}</strong>{t.auth.noRecoveryPost}
        </p>
      </form>
    </div>
  )
}
