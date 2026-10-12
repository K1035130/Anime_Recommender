/**
 * 界面语言的 context 与 hook。
 *
 * ⚠️ 与 I18nProvider（i18n.tsx）分两个文件，理由同 session-context.ts：
 *    一个文件里既导出组件又导出 hook，Vite 的 Fast Refresh 就失效。
 */

import { createContext, useContext } from 'react'
import type { Lang, Messages } from './messages'

export interface I18nValue {
  lang: Lang
  setLang: (l: Lang) => void
  /** 当前语言的文案字典。 */
  t: Messages
}

export const I18nCtx = createContext<I18nValue | null>(null)

export function useI18n(): I18nValue {
  const v = useContext(I18nCtx)
  if (!v) throw new Error('useI18n 必须在 <I18nProvider> 内使用')
  return v
}
