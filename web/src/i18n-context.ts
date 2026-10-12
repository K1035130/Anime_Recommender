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

/**
 * 英文界面的片名：AniList 官方英文名 → 原名（多为日文，是动画圈通用叫法）。
 *
 * ⚠️ 各接口的 `name` 含义不一：问卷 / 推荐里是中文名（COALESCE(name_cn, name)），
 *    搜索 / 个人页里是原名。所以「原名」由调用方显式传，不在这里猜。
 * 📌 覆盖率：问卷池 4,439 部里 65% 有官方英文名，另有 13% 原名本身是拉丁字母。
 */
export function englishTitle(nameEn: string | null | undefined, original: string): string {
  return nameEn || original
}
