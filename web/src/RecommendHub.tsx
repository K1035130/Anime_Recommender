import { useState } from 'react'
import QuestionnaireCards from './QuestionnaireCards'
import RateSearch from './RateSearch'
import RecommendResults from './RecommendResults'
import { useI18n } from './i18n-context'
import { useSession } from './session-context'

type SubTab = 'quiz' | 'rate' | 'recommend'

const SUB_TABS: [SubTab, string][] = [
  ['quiz', '📋'],
  ['rate', '⭐'],
  ['recommend', '🎯'],
]

export default function RecommendHub() {
  // ⚠️ 默认不选中任何子页——点进「动漫推荐」不该直接开始出题，
  //    要用户自己点「填写问卷」才进入问卷流程。
  const [tab, setTab] = useState<SubTab | null>(null)
  // 🚨 评分状态全部来自 useSession，本组件**不知道用户登没登录** ——
  //    存 localStorage 还是同步到账号由 session.tsx 决定。
  //    见 session.tsx 模块注释第一条。
  const { user, answers, answered, setAnswer, clearAnswers } = useSession()
  const { t } = useI18n()

  function clearAll() {
    void clearAnswers()
  }

  if (tab === null) {
    return (
      <div className="mx-auto flex h-full max-w-3xl flex-col justify-center overflow-y-auto px-4 py-10">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold">{t.nav.viewTitle.recommend}</h1>
          <p className="mt-2 text-sm text-(--color-muted)">
            {answered > 0 ? t.hub.ratedSummary(answered) : t.hub.emptyHint}
          </p>
          {/* ⚠️ 只是提示，不是门槛 —— 推荐链路零模型，游客照常可用
              （设计文档「登录不是使用门槛」，被修订的只有问答那一半）。 */}
          {!user && answered > 0 && (
            <p className="mt-1 text-xs text-(--color-muted)">{t.hub.guestHint}</p>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {SUB_TABS.map(([key, emoji]) => {
            const [title, desc] = t.hub.tabs[key]
            return (
            <button
              key={key}
              onClick={() => setTab(key)}
              className="group flex aspect-square flex-col items-center justify-center gap-3 rounded-2xl border border-(--color-line) bg-(--color-surface) p-5 text-center transition hover:-translate-y-0.5 hover:border-(--color-brand) hover:shadow-lg"
            >
              <span className="text-4xl">{emoji}</span>
              <span className="text-base font-medium group-hover:text-(--color-brand)">{title}</span>
              <span className="text-xs leading-relaxed text-(--color-muted)">{desc}</span>
            </button>
            )
          })}
        </div>

        {answered > 0 && (
          <div className="mt-6 text-center">
            <button onClick={clearAll} className="text-xs text-(--color-muted) underline">
              {t.hub.clearAll}
            </button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="mx-auto h-full max-w-3xl overflow-y-auto px-4 py-6">
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <button
          onClick={() => setTab(null)}
          className="flex items-center gap-1 rounded-lg border border-(--color-line) px-3 py-1.5 text-sm text-(--color-muted) transition hover:border-(--color-brand) hover:text-(--color-brand)"
        >
          <span aria-hidden>←</span> {t.hub.back}
        </button>
        <span className="text-sm font-medium">{t.hub.tabs[tab][0]}</span>
        <span className="ml-auto text-xs text-(--color-muted)">{t.hub.ratedCount(answered)}</span>
        {answered > 0 && (
          <button onClick={clearAll} className="text-xs text-(--color-muted) underline">
            {t.hub.clearRestart}
          </button>
        )}
      </div>

      {tab === 'quiz' && (
        <QuestionnaireCards answers={answers} onAnswer={setAnswer} onFinish={() => setTab('recommend')} />
      )}
      {tab === 'rate' && <RateSearch answers={answers} onAnswer={setAnswer} />}
      {tab === 'recommend' && <RecommendResults answers={answers} />}
    </div>
  )
}
