import { useEffect, useState } from 'react'
import { api, type Choice, type Experience, type QuestionItem } from './api'
import { errorText } from './errors'
import { useI18n } from './i18n-context'
import type { AnswerMap } from './storage'

// 开场问题：先问资历，决定后面出题的年份回溯窗口（不影响推荐范围本身，
// 只影响问卷候选池——src/questionnaire.py 的 EXPERIENCE 表）。
const EXPERIENCE_OPTIONS: Experience[] = ['new', 'mid', 'veteran']

const CHOICES: Choice[] = ['seen', 'wish', 'pass', 'skip']

type Phase = 'experience' | 'quiz'

export default function QuestionnaireCards({
  answers,
  onAnswer,
  onFinish,
}: {
  answers: AnswerMap
  onAnswer: (id: number, choice: Choice, score?: number) => void
  onFinish?: () => void
}) {
  const [phase, setPhase] = useState<Phase>('experience')
  const [experience, setExperience] = useState<Experience | null>(null)
  const [items, setItems] = useState<QuestionItem[]>([])
  const [index, setIndex] = useState(0)
  const [error, setError] = useState<unknown>(null)
  const { lang, t } = useI18n()

  useEffect(() => {
    if (experience === null) return
    setError(null)
    setIndex(0)
    api
      .questionnaire(30, experience)
      .then((r) => setItems(r.items))
      .catch((e) => setError(e ?? 'error'))
  }, [experience])

  function goTo(i: number) {
    setIndex(Math.max(0, Math.min(items.length - 1, i)))
  }

  function goPrev() {
    if (phase === 'quiz' && index === 0) {
      setPhase('experience')
    } else {
      goTo(index - 1)
    }
  }

  if (phase === 'experience') {
    return (
      <QuizBox
        eyebrow={t.quiz.openingEyebrow}
        title={t.quiz.howLong}
        subtitle={t.quiz.howLongSub}
        onPrev={null}
        onNext={() => setPhase('quiz')}
        nextDisabled={experience === null}
        nextLabel={t.quiz.start}
      >
        <div className="space-y-2">
          {EXPERIENCE_OPTIONS.map((e) => {
            const [title, desc] = t.quiz.experience[e]
            const selected = experience === e
            return (
              <OptionRow key={e} selected={selected} onClick={() => setExperience(e)}>
                <span className="block">{title}</span>
                <span className="block text-xs font-normal text-(--color-muted)">{desc}</span>
              </OptionRow>
            )
          })}
        </div>
      </QuizBox>
    )
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm">
        {errorText(error, lang)}
      </div>
    )
  }
  if (items.length === 0) {
    return <div className="text-sm text-(--color-muted)">{t.quiz.loading}</div>
  }

  const current = items[index]
  const answer = answers[current.subject_id]
  const isLast = index === items.length - 1

  return (
    <QuizBox
      eyebrow={t.quiz.questionOf(index + 1, items.length)}
      progress={(index + 1) / items.length}
      title={current.name}
      subtitle={`${current.year ?? ''}${current.year ? ' · ' : ''}${t.quiz.watchedBy(current.done.toLocaleString(t.locale))}`}
      body={<p className="mt-3 text-sm leading-relaxed text-(--color-muted)">{current.summary ?? t.quiz.noSummary}</p>}
      onPrev={goPrev}
      onNext={isLast ? () => onFinish?.() : () => goTo(index + 1)}
      nextDisabled={!answer}
      nextLabel={isLast ? t.quiz.finish : t.quiz.next}
    >
      <div className="space-y-2">
        {CHOICES.map((c) => {
          const label = t.choice[c]
          const selected = answer?.choice === c
          return (
            <OptionRow
              key={c}
              selected={selected}
              onClick={() =>
                onAnswer(current.subject_id, c, c === 'seen' ? (answer?.score ?? 8) : undefined)
              }
            >
              {label}
            </OptionRow>
          )
        })}
      </div>

      {answer?.choice === 'seen' && (
        <div className="mt-3 rounded-xl border border-(--color-line) px-4 py-3">
          <div className="mb-1.5 text-xs text-(--color-muted)">{t.quiz.scorePrompt}</div>
          <label className="flex items-center gap-3">
            <input
              type="range"
              min={1}
              max={10}
              step={0.5}
              value={answer?.score ?? 8}
              onChange={(e) => onAnswer(current.subject_id, 'seen', Number(e.target.value))}
              className="w-full accent-(--color-brand)"
            />
            <span className="w-8 shrink-0 text-right text-sm tabular-nums font-medium">
              {answer?.score ?? 8}
            </span>
          </label>
        </div>
      )}
    </QuizBox>
  )
}

/** AWS Skill Builder 单元测样式的方形选择框：标题/进度 + 内容 + 上一题/下一题。 */
function QuizBox({
  eyebrow,
  progress,
  title,
  subtitle,
  body,
  onPrev,
  onNext,
  nextDisabled,
  nextLabel,
  children,
}: {
  eyebrow: string
  progress?: number
  title: string
  subtitle?: string
  body?: React.ReactNode
  onPrev: (() => void) | null
  onNext: () => void
  nextDisabled: boolean
  nextLabel: string
  children: React.ReactNode
}) {
  const { t } = useI18n()
  return (
    <div className="flex min-h-[62vh] items-center justify-center">
      <div className="w-full max-w-md rounded-2xl border border-(--color-line) bg-(--color-surface) p-6 shadow-sm">
        <div className="mb-1.5 text-xs text-(--color-muted)">{eyebrow}</div>
        {progress != null && (
          <div className="mb-5 h-1.5 overflow-hidden rounded-full bg-(--color-line)">
            <div
              className="h-full bg-(--color-brand) transition-[width]"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
        )}

        <div className="mb-5">
          <div className="text-lg font-semibold leading-snug">{title}</div>
          {subtitle && <div className="mt-1 text-xs text-(--color-muted)">{subtitle}</div>}
          {body}
        </div>

        {children}

        <div className="mt-6 flex items-center justify-between">
          {onPrev ? (
            <button
              onClick={onPrev}
              className="rounded-lg border border-(--color-line) px-4 py-2 text-sm text-(--color-muted) transition hover:border-(--color-brand) hover:text-(--color-brand)"
            >
              {t.quiz.prev}
            </button>
          ) : (
            <span />
          )}
          <button
            onClick={onNext}
            disabled={nextDisabled}
            className="rounded-lg bg-(--color-brand) px-4 py-2 text-sm font-medium text-(--color-on-brand) transition disabled:opacity-40"
          >
            {nextLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

function OptionRow({
  selected,
  onClick,
  children,
}: {
  selected: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm transition ${
        selected
          ? 'border-(--color-brand) bg-(--color-brand)/8 font-medium text-(--color-brand)'
          : 'border-(--color-line) hover:border-(--color-brand)/60'
      }`}
    >
      <span
        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ${
          selected ? 'border-(--color-brand)' : 'border-(--color-line)'
        }`}
      >
        {selected && <span className="h-2 w-2 rounded-full bg-(--color-brand)" />}
      </span>
      <span className="flex-1">{children}</span>
    </button>
  )
}
