import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import {
  api,
  QuotaError,
  UnauthorizedError,
  type AskCandidate,
  type AskResponse,
  type AskRoute,
} from './api'
import { errorText } from './errors'
import { useI18n } from './i18n-context'
import type { Lang } from './messages'
import { useSession } from './session-context'
import { USAGE_NOTICE, USAGE_NOTICE_EN } from './usageNotice'

const ROUTES: AskRoute[] = ['auto', 'ask', 'voice', 'season', 'find']

const TEXTAREA_MAX_PX = 200

// 英文界面下按状态码给的专属提示（后端 detail 是中文，见 errors.ts）。
const EN_ASK_ERRORS = {
  401: 'Please log in to ask questions',
  // 译成中文后超过 /api/ask 的 200 字上限，或 /api/translate 的 500 字上限。
  422: 'Your question is too long — please shorten it',
  429: "You've reached the daily question limit",
  503: 'The AI service is temporarily unavailable — please try again later',
}

/**
 * 一轮问答在哪一步。
 *
 * 中文界面只会经过 asking → done；英文界面在它前后各多一步翻译
 * （/api/ask 本身只收发中文，见 i18n.tsx 的模块注释）。
 */
type Phase = 'translating-question' | 'asking' | 'translating-answer' | 'done'

interface Turn {
  id: number
  /** 提这一轮时的界面语言。⚠️ 按轮记，不读当前语言 —— 用户中途切换语言，
   *  已有的轮次不该跟着变（英文轮的回答译文是当时请求来的，中文轮没有译文）。 */
  lang: Lang
  /** 用户输入的原文（展示用）。 */
  question: string
  /** 实际送进 /api/ask 的问句：中文界面同 question，英文界面是译文。
   *  多轮历史回传的是它 —— 管道永远只见到中文。 */
  questionZh: string | null
  routeRequested: AskRoute
  scopeAtAsk: number | null
  phase: Phase
  response: AskResponse | null
  /** 英文界面：回答的英文译文。为 null 且 translationFailed 时展示中文原文。 */
  answerEn: string | null
  translationFailed: boolean
  error: string | null
  elapsedMs: number
}

let turnSeq = 0

/**
 * 这条回答的 answer 正文会不会被展示。
 *
 * season/find 成功时，answer 是同一份数据的文本复述——有结构化视图就不
 * 重复展示纯文本，避免同一条信息出现两遍。
 *
 * 🚨 **voice 是例外（2026-08-25 起）。** 它的 answer 不再是列表的复述，
 *    而是 LLM 针对问题写的回答（「最近配过什么」会挑年份最新的几部讲），
 *    藏起来等于把这次改动整个白做。判据用 meta.llm 在不在：LLM 挂掉时
 *    后端会回落成名单文本，那种情况下它**确实**是复述，仍然该藏。
 *
 * ⚠️ 抽成函数是因为英文界面要用同一个判据决定**要不要翻译**：不展示的
 *    answer 去翻译，是白白多等几秒、多花一次调用。
 */
function answerShown(res: AskResponse): boolean {
  const voiceHasProse = Boolean(res.voice) && Boolean(res.meta?.llm)
  const hasStructured =
    Boolean(res.season || res.find) || (Boolean(res.voice) && !voiceHasProse)
  return Boolean(res.answer) && !hasStructured
}

export default function AskPanel({ onOpenAuth }: { onOpenAuth: () => void }) {
  const { user, loading: sessionLoading, refreshUser, setQuotaRemaining } = useSession()
  const { lang, t } = useI18n()
  const [turns, setTurns] = useState<Turn[]>([])
  const [question, setQuestion] = useState('')
  const [routeChoice, setRouteChoice] = useState<AskRoute>('auto')
  const [spoiler, setSpoiler] = useState(false)
  const [scope, setScope] = useState<{ id: number; title: string } | null>(null)
  const [noticeOpen, setNoticeOpen] = useState(false)

  const scrollRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const busy = turns.some((t) => t.phase !== 'done')

  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
  }, [turns])

  // 输入框跟着内容长高，到 TEXTAREA_MAX_PX 为止再内部滚动。
  useLayoutEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, TEXTAREA_MAX_PX)}px`
  }, [question])

  function buildHistory(): [string, string][] {
    // ⚠️ 服务端不存会话状态（J 节），历史全靠客户端回传。
    //    服务端自己还会再截一次（MAX_HISTORY_TURNS=3），这里多传几轮也无妨。
    // ⚠️ 回传的是**中文**问句与**中文**回答（questionZh / response.answer），
    //    不是英文原文或译文 —— 管道只认中文，混进英文会让代词消解与作用域
    //    继承（J 节）在英文用户这里静默失效。
    return turns
      .filter((t) => t.response?.answer && t.questionZh)
      .slice(-4)
      .map((t) => [t.questionZh as string, t.response!.answer as string])
  }

  function patch(id: number, p: Partial<Turn>) {
    setTurns((prev) => prev.map((t) => (t.id === id ? { ...t, ...p } : t)))
  }

  /**
   * @param knownZh 已经译好的中文问句。反问后选候选作品时传入，免得同一句话
   *                再翻译一遍（多等一两秒，且两次译文可能不同）。
   */
  async function submit(q: string, route: AskRoute, scopeId: number | null, knownZh?: string) {
    const text = q.trim()
    if (!text) return
    const id = ++turnSeq
    const turnLang = lang
    const history = buildHistory()
    const startedAt = performance.now()
    const needsInbound = turnLang === 'en' && knownZh == null
    setTurns((prev) => [
      ...prev,
      {
        id,
        lang: turnLang,
        question: text,
        questionZh: needsInbound ? null : (knownZh ?? text),
        routeRequested: route,
        scopeAtAsk: scopeId,
        phase: needsInbound ? 'translating-question' : 'asking',
        response: null,
        answerEn: null,
        translationFailed: false,
        error: null,
        elapsedMs: 0,
      },
    ])

    const ticker = window.setInterval(() => {
      patch(id, { elapsedMs: performance.now() - startedAt })
    }, 400)

    try {
      // ① 英文问句 → 中文。⚠️ 失败直接报错，不拿英文原句硬送 /api/ask：
      //    管道会照常跑完，给一个看起来正常却答非所问的回答。
      let zh = knownZh ?? text
      if (needsInbound) {
        zh = (await api.translate(text, 'zh')).text
        patch(id, { questionZh: zh, phase: 'asking' })
      }

      // ② 原管道，原样。
      const res = await api.ask({
        question: zh,
        route,
        spoiler,
        top_k: 8,
        scope: scopeId,
        history,
      })
      // 每问一条就少一条，顶栏的「今日剩 N」要跟着动。
      // ⚠️ 走本地递减而不是重查 /auth/me：少一次往返，而真实值下次
      //    进页面/刷新时自然会对齐。
      if (user) setQuotaRemaining(Math.max(0, user.quota.remaining - 1))

      // ③ 中文回答 → 英文。只译会被展示的那份（见 answerShown）。
      //    ⚠️ 失败**不报错**：中文回答本身是完整可用的，退回展示它并注明。
      if (turnLang === 'en' && answerShown(res)) {
        patch(id, { response: res, phase: 'translating-answer' })
        try {
          const en = (await api.translate(res.answer as string, 'en')).text
          patch(id, { answerEn: en, phase: 'done' })
        } catch {
          patch(id, { translationFailed: true, phase: 'done' })
        }
      } else {
        patch(id, { response: res, phase: 'done' })
      }
    } catch (e) {
      // 401/429 是业务状态不是故障，各自给出下一步动作（登录 / 等配额），
      // 而不是甩一句「请求失败」。
      if (e instanceof UnauthorizedError) {
        void refreshUser()          // token 可能过期了，同步一下顶栏状态
        onOpenAuth()
      }
      if (e instanceof QuotaError) void refreshUser()
      patch(id, { phase: 'done', error: errorText(e, turnLang, EN_ASK_ERRORS) })
    } finally {
      window.clearInterval(ticker)
    }
  }

  function send() {
    if (busy || !question.trim()) return
    const q = question
    setQuestion('')
    void submit(q, routeChoice, scope?.id ?? null)
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    // ⚠️ 必须放行输入法组合中的 Enter —— 中文用户按回车是在选候选词，
    //    不判 isComposing 会把没打完的半截问题直接发出去。
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault()
      send()
    }
  }

  function pickCandidate(turn: Turn, c: AskCandidate) {
    setScope({ id: c.series_root, title: c.title })
    void submit(turn.question, routeChoice, c.series_root, turn.questionZh ?? undefined)
  }

  // 🚨 游客不能用问答（Kevin 2026-08-24 定）。这修订了设计文档那句
  //    「游客能用全部功能」—— 修订的理由是成本结构：推荐链路全程零模型，
  //    而问答每条至少两次模型调用，必须绑到账号上才能限流。
  //    ⚠️ 前端这一层只是体验，**真正的门在服务端**（_require_user）：
  //       前端拦不住直接打 API 的人，也不该假装拦得住。
  if (!sessionLoading && !user) return <GuestGate onOpenAuth={onOpenAuth} />

  const outOfQuota = user != null && user.quota.remaining <= 0

  return (
    <div className="flex h-full flex-col">
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl px-4 py-6">
          {turns.length === 0 ? (
            <EmptyState onPick={(s) => setQuestion(s)} />
          ) : (
            <div className="space-y-7">
              {turns.map((turn) => (
                <TurnView key={turn.id} turn={turn} onPickCandidate={pickCandidate} />
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="shrink-0 bg-(--color-page) px-4 pb-4">
        <div className="mx-auto max-w-3xl">
          {scope && (
            <div className="mb-2 flex items-center gap-2 rounded-lg border border-(--color-brand)/40 bg-(--color-brand)/10 px-3 py-1.5 text-xs">
              <span>{t.ask.scopeLocked(scope.title)}</span>
              <button onClick={() => setScope(null)} className="ml-auto text-(--color-muted) underline">
                {t.ask.clear}
              </button>
            </div>
          )}

          <div className="rounded-2xl border border-(--color-line) bg-(--color-surface) shadow-sm transition focus-within:border-(--color-brand)/60">
            <textarea
              ref={textareaRef}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={onKeyDown}
              rows={1}
              maxLength={t.ask.maxLength}
              placeholder={t.ask.placeholder}
              className="block w-full resize-none bg-transparent px-4 pt-3.5 pb-2 text-sm leading-relaxed outline-none placeholder:text-(--color-muted)"
            />

            <div className="flex flex-wrap items-center gap-1.5 px-3 pb-2.5">
              {ROUTES.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRouteChoice(r)}
                  className={`rounded-full border px-2.5 py-1 text-xs transition ${
                    routeChoice === r
                      ? 'border-(--color-brand) bg-(--color-brand) text-(--color-on-brand)'
                      : 'border-(--color-line) text-(--color-muted) hover:border-(--color-brand) hover:text-(--color-brand)'
                  }`}
                >
                  {t.ask.routes[r]}
                </button>
              ))}

              <label
                title={t.ask.spoilerTitle}
                className={`ml-1 flex cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition ${
                  spoiler
                    ? 'border-(--color-warn) text-(--color-warn)'
                    : 'border-(--color-line) text-(--color-muted) hover:border-(--color-warn)'
                }`}
              >
                <input
                  type="checkbox"
                  checked={spoiler}
                  onChange={(e) => setSpoiler(e.target.checked)}
                  className="h-3 w-3 accent-(--color-warn)"
                />
                {t.ask.allowSpoilers}
              </label>

              <button
                type="button"
                onClick={() => setNoticeOpen(true)}
                title={t.ask.notice}
                className="ml-auto flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-(--color-line) text-xs text-(--color-muted) transition hover:border-(--color-brand) hover:text-(--color-brand)"
              >
                ?
              </button>

              <button
                type="button"
                onClick={send}
                disabled={busy || outOfQuota || !question.trim()}
                aria-label={t.ask.send}
                title={outOfQuota ? t.ask.quotaOut : undefined}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-(--color-brand) text-(--color-on-brand) transition disabled:opacity-30"
              >
                {busy ? (
                  <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                ) : (
                  <span aria-hidden className="text-sm leading-none">↑</span>
                )}
              </button>
            </div>
          </div>

          <p className="mt-2 text-center text-[11px] text-(--color-muted)">
            {outOfQuota ? (
              <span className="text-(--color-warn)">
                {t.ask.quotaUsedUp(user?.quota.limit ?? 0)}
                {user?.quota.reset_at
                  ? t.ask.quotaResetAt(
                      new Date(user.quota.reset_at).toLocaleString(t.locale, {
                        month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit',
                      }),
                    )
                  : t.ask.quotaLater}
              </span>
            ) : (
              <>
                {t.ask.footer}
                {user && t.ask.footerLeft(user.quota.remaining)}
              </>
            )}
          </p>
        </div>
      </div>

      {noticeOpen && <NoticeDrawer onClose={() => setNoticeOpen(false)} />}
    </div>
  )
}

function GuestGate({ onOpenAuth }: { onOpenAuth: () => void }) {
  const { t } = useI18n()
  return (
    <div className="flex h-full flex-col items-center justify-center px-4 text-center">
      <span className="text-4xl">💬</span>
      <h1 className="mt-4 text-2xl font-semibold">{t.ask.guestTitle}</h1>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-(--color-muted)">
        {t.ask.guestBodyPre}
        <strong className="text-(--color-ink)">{t.ask.guestBodyStrong}</strong>
        {t.ask.guestBodyPost}
      </p>
      <p className="mt-1 max-w-md text-sm leading-relaxed text-(--color-muted)">{t.ask.guestFree}</p>
      <button
        onClick={onOpenAuth}
        className="mt-6 rounded-lg bg-(--color-brand) px-5 py-2 text-sm font-medium text-(--color-on-brand)"
      >
        {t.ask.guestButton}
      </button>
    </div>
  )
}

function EmptyState({ onPick }: { onPick: (s: string) => void }) {
  const { t } = useI18n()
  return (
    <div className="flex min-h-[45vh] flex-col items-center justify-center text-center">
      <h1 className="text-2xl font-semibold">{t.ask.emptyTitle}</h1>
      <p className="mt-2 text-sm text-(--color-muted)">{t.ask.emptySub}</p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        {t.ask.suggestions.map((s) => (
          <button
            key={s}
            onClick={() => onPick(s)}
            className="rounded-full border border-(--color-line) bg-(--color-surface) px-3 py-1.5 text-xs text-(--color-muted) transition hover:border-(--color-brand) hover:text-(--color-brand)"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  )
}

function TurnView({
  turn,
  onPickCandidate,
}: {
  turn: Turn
  onPickCandidate: (turn: Turn, c: AskCandidate) => void
}) {
  const { t } = useI18n()
  const loading = turn.phase !== 'done'
  const phaseLabel =
    turn.phase === 'translating-question'
      ? t.ask.translatingQuestion
      : turn.phase === 'translating-answer'
        ? t.ask.translatingAnswer
        : t.ask.thinking
  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <div className="max-w-[80%] rounded-2xl bg-(--color-line)/50 px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap">
          {turn.question}
          {turn.scopeAtAsk != null && (
            <div className="mt-1 text-[11px] text-(--color-muted)">{t.ask.scoped}</div>
          )}
        </div>
      </div>

      {/* ⚠️ 回答不套气泡：这条链路的回答动辄几百字带出处列表，
          包进气泡会挤成窄条，平铺可读性好得多（Claude 网页版同理）。 */}
      <div className="text-sm">
        {turn.response && <ResponseView turn={turn} onPickCandidate={onPickCandidate} />}
        {loading && (
          <div className={`flex items-center gap-2 text-(--color-muted) ${turn.response ? 'mt-3' : ''}`}>
            <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-(--color-brand) border-t-transparent" />
            <span>
              {phaseLabel}
              {turn.elapsedMs > 1500 ? `${(turn.elapsedMs / 1000).toFixed(0)}s` : ''}
              {turn.phase === 'asking' && turn.elapsedMs > 6000 ? t.ask.slowHint : ''}
            </span>
          </div>
        )}
        {turn.error && <div className="text-(--color-danger)">{t.ask.failed(turn.error)}</div>}
      </div>
    </div>
  )
}

function ResponseView({
  turn,
  onPickCandidate,
}: {
  turn: Turn
  onPickCandidate: (turn: Turn, c: AskCandidate) => void
}) {
  const { t } = useI18n()
  const res = turn.response!
  const isEn = turn.lang === 'en'
  const displayRoute = t.ask.routeDisplay[res.route] ?? res.route

  // 英文轮：译文到了就展示译文；翻译中先不展示中文（免得一闪而过）；
  // 翻译失败则退回中文原文并注明。
  let answerText: string | null = null
  if (answerShown(res)) {
    if (!isEn) answerText = res.answer
    else if (turn.answerEn) answerText = turn.answerEn
    else if (turn.translationFailed) answerText = res.answer
  }
  // 英文界面显示原名（多为日文/罗马字），中文界面优先中文名。
  const pickName = (name: string, nameCn: string | null) => (isEn ? name : (nameCn ?? name))

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-(--color-muted)">
        <span
          className="rounded bg-(--color-brand)/12 px-1.5 py-0.5 text-(--color-brand)"
          title={isEn ? undefined : res.route_reason}
        >
          {t.ask.route(displayRoute)}
        </span>
        {/* ⚠️ route_reason 是后端写的中文说明，英文轮不展示 —— 为它再调一次
            翻译不值得，路由标签本身已经说明了走的是哪条分支。 */}
        {!isEn && res.route_reason && <span className="italic">{res.route_reason}</span>}
      </div>

      {answerText && <p className="leading-7 whitespace-pre-wrap">{answerText}</p>}
      {isEn && turn.translationFailed && (
        <p className="text-xs text-(--color-warn)">{t.ask.translationFailed}</p>
      )}

      {res.state === 'ambiguous' && res.candidates.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {res.candidates.map((c) => (
            <button
              key={c.series_root}
              onClick={() => onPickCandidate(turn, c)}
              className="rounded-full border border-(--color-line) px-2.5 py-1 text-xs transition hover:border-(--color-brand) hover:text-(--color-brand)"
            >
              {t.ask.candidate(c.title, c.year)}
            </button>
          ))}
        </div>
      )}

      {res.route === 'ask' && res.state === 'ok' && res.chunks.length > 0 && (
        <details className="rounded-lg border border-(--color-line) px-2.5 py-1.5">
          <summary className="cursor-pointer text-xs text-(--color-muted)">
            {t.ask.sources(res.chunks.length)}
          </summary>
          <ul className="mt-2 space-y-1.5">
            {res.chunks.map((ch) => (
              <li key={ch.chunk_id} className="rounded border border-(--color-line) bg-(--color-page) px-2 py-1.5 text-xs">
                <div className="mb-1 flex flex-wrap items-center gap-1 text-(--color-muted)">
                  {ch.section && <span className="font-medium text-(--color-ink)">【{ch.section}】</span>}
                  <span className="rounded bg-(--color-line)/40 px-1">{ch.kind}</span>
                  <span>{ch.source === 'moegirl' ? t.ask.moegirl : 'Bangumi'}</span>
                  {ch.pinned && <span className="rounded bg-(--color-brand)/12 px-1 text-(--color-brand)">{t.ask.exactMatch}</span>}
                  {ch.spoiler_level > 0 && <span className="rounded bg-red-500/10 px-1 text-(--color-danger)">{t.ask.spoiler}</span>}
                </div>
                {/* 出处是语料原文，有意不翻译：它的用途是让用户核对回答，
                    译一遍就不再是「原文」了。 */}
                <p className="whitespace-pre-wrap text-(--color-muted)">{ch.text}</p>
              </li>
            ))}
          </ul>
        </details>
      )}

      {res.voice && (
        <div className="rounded-lg border border-(--color-line) px-2.5 py-2 text-xs">
          <div className="mb-1.5 font-medium">
            {t.ask.voiceHeader(pickName(res.voice.name, res.voice.name_cn), res.voice.n_roles)}
          </div>
          <ul className="space-y-1">
            {res.voice.items.map((r) => (
              <li key={`${r.character_id}-${r.series_root}`} className="flex justify-between gap-2 text-(--color-muted)">
                <span>
                  {r.character_name ?? t.ask.unknownCharacter} · {t.ask.candidate(r.title, null)}
                  {r.air_year ? t.ask.year(r.air_year) : ''}
                </span>
                {r.role_type === 1 && <span className="shrink-0 text-(--color-brand)">{t.ask.lead}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {res.season && (
        <div className="rounded-lg border border-(--color-line) px-2.5 py-2 text-xs">
          <div className="mb-1.5 font-medium">
            {t.ask.seasonHeader(res.season.year, res.season.month, res.season.total)}
          </div>
          <ul className="space-y-1">
            {res.season.items.map((it) => (
              <li key={it.subject_id} className="flex justify-between gap-2 text-(--color-muted)">
                <span>{pickName(it.name, it.name_cn)}</span>
                <span className="shrink-0">{it.air_date}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {res.find && (
        <div className="rounded-lg border border-(--color-line) px-2.5 py-2 text-xs">
          <ul className="space-y-1">
            {res.find.items.map((h, i) => (
              <li key={h.subject_id} className="flex justify-between gap-2 text-(--color-muted)">
                <span>
                  {i + 1}. {h.name}
                  {h.air_year ? t.ask.year(h.air_year) : ''}
                </span>
                <a
                  href={`https://bgm.tv/subject/${h.subject_id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="shrink-0 text-(--color-brand) hover:underline"
                >
                  {t.ask.details}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      {res.series_root && (
        <a
          href={`https://bgm.tv/subject/${res.series_root}`}
          target="_blank"
          rel="noreferrer"
          className="inline-block text-[11px] text-(--color-brand) hover:underline"
        >
          {res.title ?? t.ask.viewEntry} → Bangumi
        </a>
      )}
    </div>
  )
}

function NoticeDrawer({ onClose }: { onClose: () => void }) {
  const { lang, t } = useI18n()
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-(--color-line) bg-(--color-surface) p-5 sm:rounded-2xl"
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-medium">{t.ask.notice}</h2>
          <button onClick={onClose} className="text-sm text-(--color-muted) hover:text-(--color-ink)">
            {t.ask.close}
          </button>
        </div>
        <pre className="whitespace-pre-wrap font-sans text-xs leading-relaxed text-(--color-muted)">
          {lang === 'en' ? USAGE_NOTICE_EN : USAGE_NOTICE}
        </pre>
      </div>
    </div>
  )
}
