import { useState } from 'react'
import { api, type Mode, type RankBy, type Recommendation } from './api'
import { errorText } from './errors'
import { useI18n } from './i18n-context'
import type { AnswerMap } from './storage'
import { toAnswers } from './storage'

const MODES: Mode[] = ['all', 'season', 'aired', 'upcoming', 'recent', 'classic']

export default function RecommendResults({ answers }: { answers: AnswerMap }) {
  const [recs, setRecs] = useState<Recommendation[] | null>(null)
  const [mode, setMode] = useState<Mode>('all')
  const [rankBy, setRankBy] = useState<RankBy>('blend')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<unknown>(null)
  const { lang, t } = useI18n()

  const answered = Object.values(answers).filter((a) => a.choice !== 'skip').length

  async function getRecs() {
    setBusy(true)
    setError(null)
    try {
      const r = await api.recommend({
        answers: toAnswers(answers),
        mode,
        rank_by: rankBy,
        top_k: 15,
      })
      setRecs(r.items)
    } catch (e) {
      setError(e ?? 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      {error != null && (
        <div className="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm">
          {errorText(error, lang)}
        </div>
      )}

      {answered === 0 && (
        <p className="mb-4 text-sm text-(--color-muted)">{t.results.noRatings}</p>
      )}

      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-(--color-line) bg-(--color-surface) px-3 py-2.5">
        <select
          value={mode}
          onChange={(e) => setMode(e.target.value as Mode)}
          className="rounded-lg border border-(--color-line) bg-(--color-page) px-2 py-1.5 text-sm"
        >
          {MODES.map((m) => (
            <option key={m} value={m}>
              {t.results.modes[m]}
            </option>
          ))}
        </select>
        <select
          value={rankBy}
          onChange={(e) => setRankBy(e.target.value as RankBy)}
          className="rounded-lg border border-(--color-line) bg-(--color-page) px-2 py-1.5 text-sm"
          title={t.results.rankTitle}
        >
          <option value="blend">{t.results.rankBlend}</option>
          <option value="match">{t.results.rankMatch}</option>
          <option value="quality">{t.results.rankQuality}</option>
        </select>
        <button
          onClick={getRecs}
          disabled={busy || answered === 0}
          className="ml-auto rounded-lg bg-(--color-brand) px-4 py-1.5 text-sm font-medium text-(--color-on-brand) disabled:opacity-40"
        >
          {busy ? t.results.busy : answered === 0 ? t.results.needRatings : t.results.go}
        </button>
      </div>

      {recs && (
        <section className="mt-6">
          <h2 className="mb-3 text-lg font-medium">{t.results.heading}</h2>
          {recs.length === 0 ? (
            <p className="text-sm text-(--color-muted)">{t.results.empty}</p>
          ) : (
            <ol className="space-y-2">
              {/* ⚠️ 直接按返回顺序渲染。列表已按 rank_score 降序，不要重排 */}
              {recs.map((r, i) => (
                <RecRow key={r.subject_id} rec={r} rank={i + 1} />
              ))}
            </ol>
          )}
        </section>
      )}
    </div>
  )
}

function RecRow({ rec, rank }: { rec: Recommendation; rank: number }) {
  const { t } = useI18n()
  return (
    <li className="flex gap-3 rounded-xl border border-(--color-line) bg-(--color-surface) px-3 py-2.5">
      <span className="w-6 shrink-0 pt-0.5 text-sm tabular-nums text-(--color-muted)">
        {rank}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2">
          <a
            href={`https://bgm.tv/subject/${rec.subject_id}`}
            target="_blank"
            rel="noreferrer"
            className="font-medium hover:text-(--color-brand) hover:underline"
          >
            {rec.name}
          </a>
          <span className="text-xs text-(--color-muted)">{rec.year}</span>
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          {rec.reasons.map((t) => (
            <span
              key={t}
              className="rounded bg-(--color-brand)/12 px-1.5 py-0.5 text-xs text-(--color-brand)"
            >
              {t}
            </span>
          ))}
        </div>
      </div>
      <div className="shrink-0 text-right text-xs tabular-nums text-(--color-muted)">
        <div>{t.results.score(rec.bgm_score?.toFixed(1) ?? '—')}</div>
        <div>{t.results.match((rec.match * 100).toFixed(0))}</div>
      </div>
    </li>
  )
}
