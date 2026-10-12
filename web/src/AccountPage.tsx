/**
 * 个人中心：账号信息 + 改用户名 / 改密码 + 已打分动画的查看与修改。
 *
 * 🚨 **评分的读写仍然只走 `useSession()` 的 `{answers, setAnswer}`。**
 *    本页从 `/ratings/detail` 拿的**只有展示字段**（作品名、年份、热度）——
 *    那是「这部番叫什么」，不是「用户给它打了几分」。后者的唯一入口仍是
 *    session.tsx，它负责决定写 localStorage 还是同步到账号。
 *    ⚠️ 别图省事改成「直接 PUT /ratings 保存」——那会绕开防抖批量与
 *       失败重放，且让评分状态出现第二个事实来源（见 session.tsx 首条注释）。
 *
 * 📌 **本页读 `user` 是允许的，与上面那条不矛盾。** session.tsx 禁止的是
 *    「上层组件自己判断登没登录来决定评分存哪」；而本页整个存在的前提
 *    就是已登录（未登录时顶栏根本不显示入口），读 user 是读它自己的主题
 *    数据，不是在分支存储逻辑。
 *
 * ## 列表的两个数据源怎么合的
 *
 *     快照 detail[]   进页面时拉一次 —— 作品名/年份/热度，**不含最新评分**
 *     answers（session）实时 —— choice / score
 *
 * ⚠️ 行的 choice/score **一律从 answers 读**，不读快照里的那两列。
 *    否则用户改完分，列表还显示旧值，要刷新才变 —— 而他刚刚才点过。
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { api, UnauthorizedError, type Choice, type RatedItem } from './api'
import { errorText } from './errors'
import { useI18n } from './i18n-context'
import { useSession } from './session-context'

const CHOICES: Choice[] = ['seen', 'wish', 'pass']

type Filter = 'all' | Choice
type SortBy = 'recent' | 'score' | 'year' | 'done'

const SORTS: SortBy[] = ['recent', 'score', 'year', 'done']

// 英文界面下按状态码给的专属提示（后端 detail 是中文，见 errors.ts）。
const EN_USERNAME_ERRORS = {
  401: 'Current password is incorrect',
  409: 'That username is already taken',
  422: 'Username must be 2–20 characters (letters, digits, Chinese, _ or -)',
}
const EN_PASSWORD_ERRORS = {
  401: 'Current password is incorrect',
  422: 'The new password must be at least 8 characters',
}

export default function AccountPage({
  onOpenAuth,
  onLoggedOut,
}: {
  onOpenAuth: () => void
  onLoggedOut: () => void
}) {
  const { user, loading } = useSession()
  const { t } = useI18n()

  if (loading) {
    return <Centered>{t.account.checking}</Centered>
  }

  // 登录态过期时的兜底：顶栏不会给未登录用户入口，但 token 可能在页面
  // 打开期间过期 —— 直接白屏或报错都比这条提示差。
  if (!user) {
    return (
      <Centered>
        <p className="mb-3">{t.account.needLogin}</p>
        <button
          onClick={onOpenAuth}
          className="rounded-lg border border-(--color-line) px-4 py-2 text-sm transition hover:border-(--color-brand) hover:text-(--color-brand)"
        >
          {t.account.goLogin}
        </button>
      </Centered>
    )
  }

  return (
    <div className="mx-auto h-full max-w-3xl overflow-y-auto px-4 py-6">
      <AccountCard onLoggedOut={onLoggedOut} />
      <SecuritySection />
      <RatedList />
    </div>
  )
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex h-full max-w-3xl flex-col items-center justify-center px-4 text-center text-sm text-(--color-muted)">
      {children}
    </div>
  )
}

// ── 账号信息 ──────────────────────────────────────────────────

function AccountCard({ onLoggedOut }: { onLoggedOut: () => void }) {
  const { user, answered, logout } = useSession()
  const { t } = useI18n()
  const [busy, setBusy] = useState(false)
  if (!user) return null

  async function signOut() {
    setBusy(true)
    try {
      // ⚠️ 必须走 session 的 logout()，别自己调 api.logout() —— 它会**先
      //    flush 未同步的评分再登出**，绕过去的话防抖窗口里那批分就丢了。
      await logout()
      // 登出后本页会变成「需要登录后查看」的死胡同，交给 App 切回首页。
      onLoggedOut()
    } catch {
      setBusy(false)
    }
  }

  const created = user.created_at.slice(0, 10)
  return (
    <section className="mb-5 rounded-2xl border border-(--color-line) bg-(--color-surface) p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h1 className="text-xl font-semibold">{user.username}</h1>
          <span className="text-xs text-(--color-muted)">{t.account.joined(created)}</span>
        </div>
        {/* 登出从顶栏挪到这里。⚠️ 有意**不**复用 secondaryBtn：那是
            「修改用户名/密码」的样式，登出跟它们并列会显得是同一类操作，
            而这里它只是卡片上的一个次级动作。 */}
        <button
          onClick={() => void signOut()}
          disabled={busy}
          className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-lg border border-(--color-line) px-4 py-2 text-sm text-(--color-muted) transition hover:border-(--color-brand) hover:text-(--color-brand) disabled:opacity-40"
        >
          <LogoutIcon />
          {busy ? t.account.loggingOut : t.account.logout}
        </button>
      </div>
      <div className="mt-3 flex flex-wrap gap-2 text-xs">
        <Stat label={t.account.statRated} value={t.account.works(answered)} />
        {/* ⚠️ rating_count 是**服务端**已保存的条数，answered 是本地视图 ——
            两者不一致就说明还有没同步上去的（防抖窗口内或同步失败）。
            有意都显示出来，而不是挑一个：藏起来的话同步失败是静默的。 */}
        <Stat label={t.account.statSynced} value={t.account.works(user.rating_count)} />
        <Stat
          label={t.account.statQuota}
          value={t.account.quotaValue(user.quota.remaining, user.quota.limit)}
        />
      </div>
      {answered !== user.rating_count && (
        <p className="mt-2 text-xs text-(--color-warn)">
          {t.account.unsynced(answered, user.rating_count)}
        </p>
      )}
    </section>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <span className="rounded-lg bg-(--color-page) px-2.5 py-1.5">
      <span className="text-(--color-muted)">{label} </span>
      <span className="font-medium">{value}</span>
    </span>
  )
}

// ── 改用户名 / 改密码 ─────────────────────────────────────────

function SecuritySection() {
  const [open, setOpen] = useState<'none' | 'username' | 'password'>('none')
  const { t } = useI18n()

  return (
    <section className="mb-5 rounded-2xl border border-(--color-line) bg-(--color-surface) p-5">
      <h2 className="mb-1 text-base font-medium">{t.account.settings}</h2>
      <p className="mb-3 text-xs text-(--color-muted)">
        {t.account.settingsHint}
        {/* 说清楚为什么要密码，否则用户会觉得是多余的摩擦。 */}
        <br />
        {t.account.noRecovery}
      </p>

      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => setOpen(open === 'username' ? 'none' : 'username')}
          className={secondaryBtn}
        >
          <PencilIcon />
          {t.account.changeUsername}
        </button>
        <button
          onClick={() => setOpen(open === 'password' ? 'none' : 'password')}
          className={secondaryBtn}
        >
          <LockIcon />
          {t.account.changePassword}
        </button>
      </div>

      {open === 'username' && <UsernameForm onDone={() => setOpen('none')} />}
      {open === 'password' && <PasswordForm onDone={() => setOpen('none')} />}
    </section>
  )
}

/**
 * ⚠️ `min-h-11` = 44px，是**触控目标下限**不是装饰 —— 手机上点不中比不好看
 *    严重得多。padding 撑不到 44px 的地方（text-sm 那几处）都靠它兜底，
 *    所以改 padding/字号时别顺手把它删了。
 */
const secondaryBtn =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-(--color-line) px-5 py-3 text-base font-medium transition hover:border-(--color-brand) hover:text-(--color-brand)'

// 图标用 inline SVG：项目没有图标库，不为两个图标加依赖；currentColor 让它
// 跟着按钮文字变色（含 hover 与深色模式），aria-hidden 让读屏跳过。
function PencilIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  )
}

function LockIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  )
}

function LogoutIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="m16 17 5-5-5-5" />
      <path d="M21 12H9" />
    </svg>
  )
}

function UsernameForm({ onDone }: { onDone: () => void }) {
  const { user, refreshUser } = useSession()
  const { lang, t } = useI18n()
  const [username, setUsername] = useState(user?.username ?? '')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await api.changeUsername(username.trim(), password)
      await refreshUser()      // 顶栏那个名字也要跟着变
      setOk(true)
      setPassword('')
      // 留一会儿让用户看到「已保存」，再收起表单。
      window.setTimeout(onDone, 1200)
    } catch (err) {
      setError(errorText(err, lang, EN_USERNAME_ERRORS))
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="mt-4 space-y-3 border-t border-(--color-line) pt-4">
      <Field label={t.account.newUsername}>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
          maxLength={20}
          autoComplete="username"
          className={inputCls}
        />
      </Field>
      <Field label={t.account.currentPassword}>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="current-password"
          className={inputCls}
        />
      </Field>
      <FormFooter busy={busy} error={error} ok={ok} okText={t.account.usernameSaved} onCancel={onDone} />
    </form>
  )
}

function PasswordForm({ onDone }: { onDone: () => void }) {
  const { refreshUser } = useSession()
  const { lang, t } = useI18n()
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [again, setAgain] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    // ⚠️ 两次输入不一致在前端就拦下来：这不是安全校验（服务端只认
    //    new_password 一个值），纯粹是防手误 —— 而密码打错了又找不回。
    if (next !== again) {
      setError(t.account.mismatch)
      return
    }
    setBusy(true)
    setError(null)
    try {
      await api.changePassword(current, next)
      await refreshUser()
      setOk(true)
      setCurrent('')
      setNext('')
      setAgain('')
      window.setTimeout(onDone, 1200)
    } catch (err) {
      setError(errorText(err, lang, EN_PASSWORD_ERRORS))
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="mt-4 space-y-3 border-t border-(--color-line) pt-4">
      <Field label={t.account.currentPassword}>
        <input
          type="password"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          required
          autoComplete="current-password"
          className={inputCls}
        />
      </Field>
      <Field label={t.account.newPassword}>
        <input
          type="password"
          value={next}
          onChange={(e) => setNext(e.target.value)}
          required
          minLength={8}
          autoComplete="new-password"
          className={inputCls}
        />
      </Field>
      <Field label={t.account.newPasswordAgain}>
        <input
          type="password"
          value={again}
          onChange={(e) => setAgain(e.target.value)}
          required
          minLength={8}
          autoComplete="new-password"
          className={inputCls}
        />
      </Field>
      <p className="text-[11px] leading-relaxed text-(--color-muted)">
        {/* 诚实说明已知缺口，见 server/main.py::change_password 的 docstring。 */}
        {t.account.sessionsNote}
      </p>
      <FormFooter busy={busy} error={error} ok={ok} okText={t.account.passwordSaved} onCancel={onDone} />
    </form>
  )
}

const inputCls =
  'w-full rounded-lg border border-(--color-line) bg-(--color-page) px-3 py-2 text-sm outline-none focus:border-(--color-brand)'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs text-(--color-muted)">{label}</span>
      {children}
    </label>
  )
}

function FormFooter({
  busy,
  error,
  ok,
  okText,
  onCancel,
}: {
  busy: boolean
  error: string | null
  ok: boolean
  okText: string
  onCancel: () => void
}) {
  const { t } = useI18n()
  return (
    <>
      {error != null && (
        <div className="rounded-lg border border-(--color-danger)/40 bg-(--color-danger)/10 px-3 py-2 text-xs text-(--color-danger)">
          {error}
        </div>
      )}
      {ok && (
        <div className="rounded-lg border border-(--color-brand)/40 bg-(--color-brand)/10 px-3 py-2 text-xs text-(--color-brand)">
          {okText}
        </div>
      )}
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={busy}
          className="inline-flex min-h-11 items-center justify-center rounded-lg bg-(--color-brand) px-6 py-3 text-base font-medium text-(--color-on-brand) transition disabled:opacity-40"
        >
          {busy ? t.account.saving : t.account.save}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex min-h-11 items-center justify-center rounded-lg border border-(--color-line) px-6 py-3 text-base text-(--color-muted) transition hover:border-(--color-brand) hover:text-(--color-brand)"
        >
          {t.account.cancel}
        </button>
      </div>
    </>
  )
}

// ── 已打分的动画 ──────────────────────────────────────────────

function RatedList() {
  const { answers, setAnswer, clearAnswers } = useSession()
  const [snapshot, setSnapshot] = useState<RatedItem[] | null>(null)
  const [error, setError] = useState<unknown>(null)
  const { lang, t } = useI18n()
  const [filter, setFilter] = useState<Filter>('all')
  const [sortBy, setSortBy] = useState<SortBy>('recent')
  const [q, setQ] = useState('')

  const reload = useCallback(async () => {
    setError(null)
    try {
      const { items } = await api.ratingsDetail()
      setSnapshot(items)
    } catch (e) {
      // 未登录由外层处理，这里只报别的失败。
      if (!(e instanceof UnauthorizedError)) setError(e ?? 'error')
      setSnapshot([])
    }
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  // 快照里没有、但 answers 里有的 —— 本次会话刚打的分（在推荐页打的）。
  // ⚠️ 不自动重拉：那会在用户每改一次分时打一次请求。给个按钮，说清楚为什么。
  const missing = useMemo(() => {
    if (!snapshot) return 0
    const known = new Set(snapshot.map((it) => it.subject_id))
    return Object.entries(answers).filter(
      ([id, a]) => a.choice !== 'skip' && !known.has(Number(id)),
    ).length
  }, [snapshot, answers])

  const rows = useMemo(() => {
    if (!snapshot) return []
    const kw = q.trim().toLowerCase()
    const out = snapshot.filter((it) => {
      const cur = answers[it.subject_id]
      // 已在本页移除的（choice 变 skip / 记录被删）仍然留在列表里显示为
      // 「已移除」，好让用户能撤销 —— 所以这里不按 cur 是否存在过滤。
      const choice = cur?.choice ?? it.choice
      if (filter !== 'all' && choice !== filter) return false
      if (!kw) return true
      return (
        it.name.toLowerCase().includes(kw) ||
        (it.name_cn ?? '').toLowerCase().includes(kw)
      )
    })

    const scoreOf = (it: RatedItem) => answers[it.subject_id]?.score ?? it.score ?? -1
    const sorted = [...out]
    if (sortBy === 'score') sorted.sort((a, b) => scoreOf(b) - scoreOf(a))
    else if (sortBy === 'year') sorted.sort((a, b) => (b.air_year ?? 0) - (a.air_year ?? 0))
    else if (sortBy === 'done') sorted.sort((a, b) => (b.fav_done ?? 0) - (a.fav_done ?? 0))
    // 'recent' 就是服务端给的顺序（updated_at DESC），不用再排。
    return sorted
  }, [snapshot, answers, filter, sortBy, q])

  const counts = useMemo(() => {
    const c = { seen: 0, wish: 0, pass: 0 }
    for (const a of Object.values(answers)) {
      if (a.choice === 'seen' || a.choice === 'wish' || a.choice === 'pass') c[a.choice] += 1
    }
    return c
  }, [answers])

  if (snapshot === null) {
    return <p className="py-8 text-center text-sm text-(--color-muted)">{t.account.loadingRatings}</p>
  }

  return (
    <section className="rounded-2xl border border-(--color-line) bg-(--color-surface) p-5">
      <div className="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2 className="text-base font-medium">{t.account.ratedHeading}</h2>
        <span className="text-xs text-(--color-muted)">
          {t.account.counts(counts.seen, counts.wish, counts.pass)}
        </span>
        {snapshot.length > 0 && (
          <button
            onClick={() => void clearAnswers().then(reload)}
            className="ml-auto text-xs text-(--color-muted) underline hover:text-(--color-danger)"
          >
            {t.account.clearAll}
          </button>
        )}
      </div>

      {error != null && (
        <div className="mb-3 rounded-lg border border-(--color-danger)/40 bg-(--color-danger)/10 px-3 py-2 text-xs text-(--color-danger)">
          {errorText(error, lang)}
        </div>
      )}

      {missing > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-(--color-line) bg-(--color-page) px-3 py-2 text-xs">
          <span>{t.account.missing(missing)}</span>
          <button onClick={() => void reload()} className="underline hover:text-(--color-brand)">
            {t.account.refresh}
          </button>
        </div>
      )}

      {snapshot.length === 0 ? (
        <p className="py-6 text-center text-sm text-(--color-muted)">{t.account.noneYet}</p>
      ) : (
        <>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t.account.searchRated}
              className="min-h-11 min-w-40 flex-1 rounded-lg border border-(--color-line) bg-(--color-page) px-3 py-2.5 text-sm outline-none focus:border-(--color-brand)"
            />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as Filter)}
              className="min-h-11 rounded-lg border border-(--color-line) bg-(--color-page) px-3 py-2.5 text-sm"
            >
              <option value="all">{t.account.filterAll}</option>
              {CHOICES.map((c) => (
                <option key={c} value={c}>
                  {t.choice[c]}
                </option>
              ))}
            </select>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortBy)}
              className="min-h-11 rounded-lg border border-(--color-line) bg-(--color-page) px-3 py-2.5 text-sm"
            >
              {SORTS.map((v) => (
                <option key={v} value={v}>
                  {t.account.sortBy(t.account.sorts[v])}
                </option>
              ))}
            </select>
          </div>

          <ul className="space-y-2">
            {rows.map((it) => (
              <RatedRow
                key={it.subject_id}
                item={it}
                current={answers[it.subject_id]}
                onAnswer={setAnswer}
              />
            ))}
          </ul>
          {rows.length === 0 && (
            <p className="py-6 text-center text-sm text-(--color-muted)">{t.account.noMatch}</p>
          )}
        </>
      )}
    </section>
  )
}

function RatedRow({
  item,
  current,
  onAnswer,
}: {
  item: RatedItem
  current?: { choice: Choice; score?: number }
  onAnswer: (id: number, choice: Choice, score?: number) => void
}) {
  // ⚠️ 显示值优先取 answers（实时），快照只作为它还没加载/已被移除时的底。
  const choice = current?.choice
  const removed = choice === undefined || choice === 'skip'
  const score = current?.score ?? item.score ?? 8
  const { lang, t } = useI18n()
  // 英文界面主标题用原名、副标题放中文名；中文界面反过来。
  const title = lang === 'en' ? item.name : (item.name_cn ?? item.name)
  const subtitle = lang === 'en' ? item.name_cn : item.name

  return (
    <li
      className={`rounded-xl border px-3 py-2.5 transition ${
        removed
          ? 'border-dashed border-(--color-line) opacity-60'
          : 'border-(--color-line)'
      }`}
    >
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="font-medium">{title}</span>
        {item.name_cn && item.name !== item.name_cn && (
          <span className="text-xs text-(--color-muted)">{subtitle}</span>
        )}
      </div>
      <div className="mt-0.5 text-xs text-(--color-muted)">
        {[
          item.air_year,
          item.form,
          item.fav_done ? t.account.watchedBy(item.fav_done.toLocaleString(t.locale)) : null,
          item.bgm_score ? t.account.siteScore(item.bgm_score.toFixed(1)) : null,
          item.source === 'questionnaire' ? t.account.fromQuiz : null,
        ]
          .filter(Boolean)
          .join(' · ')}
      </div>

      {removed ? (
        <div className="mt-2 flex items-center gap-2 text-xs">
          <span className="text-(--color-muted)">{t.account.removed}</span>
          <button
            // 撤销回快照里的原值 —— 快照是进页面时的服务端状态，
            // 正是用户按「移除」之前的那一份。
            onClick={() =>
              onAnswer(
                item.subject_id,
                item.choice,
                item.choice === 'seen' ? (item.score ?? 8) : undefined,
              )
            }
            className="underline hover:text-(--color-brand)"
          >
            {t.account.undo(t.choice[item.choice] ?? item.choice)}
          </button>
        </div>
      ) : (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {CHOICES.map((c) => (
            <button
              key={c}
              onClick={() =>
                onAnswer(item.subject_id, c, c === 'seen' ? score : undefined)
              }
              // ⚠️ 未选中态给了 bg-(--color-page)：卡片是 --color-surface，两者
              //    有一档色差 ⇒ 不 hover 也看得出这是个可点的按钮。只留边框的话
              //    在浅色模式下几乎与卡片同色，用户会以为是纯文字标签。
              className={`inline-flex min-h-11 items-center justify-center rounded-lg border px-4 py-2 text-sm transition ${
                choice === c
                  ? 'border-(--color-brand) bg-(--color-brand) font-medium text-(--color-on-brand)'
                  : 'border-(--color-line) bg-(--color-page) hover:border-(--color-brand) hover:text-(--color-brand)'
              }`}
            >
              {t.choice[c]}
            </button>
          ))}

          {choice === 'seen' && (
            <label className="ml-1 flex items-center gap-2 text-xs">
              <input
                type="range"
                min={1}
                max={10}
                step={0.5}
                value={score}
                onChange={(e) =>
                  onAnswer(item.subject_id, 'seen', Number(e.target.value))
                }
                className="h-11 w-40 accent-(--color-brand)"
              />
              <span className="w-10 text-base font-semibold tabular-nums">{score}</span>
            </label>
          )}

          <button
            // 'skip' 会让服务端删掉这一行（「没看过」用缺失表示）。
            onClick={() => onAnswer(item.subject_id, 'skip')}
            className="ml-auto inline-flex min-h-11 items-center justify-center rounded-lg border border-(--color-danger)/40 px-4 py-2 text-sm text-(--color-danger) transition hover:border-(--color-danger) hover:bg-(--color-danger)/10"
          >
            {t.account.remove}
          </button>
        </div>
      )}
    </li>
  )
}
