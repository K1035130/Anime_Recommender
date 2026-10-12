/**
 * 界面语言（中 / 英）。
 *
 * 📌 **语言只影响展示，不进任何请求体**（/api/translate 除外）。推荐、问卷、
 *    打分的请求与语言无关；问答的英文路径是 AskPanel 在 /api/ask 前后各调一次
 *    /api/translate，/api/ask 本身永远只收发中文。
 *
 * 选择记在 localStorage（纯展示偏好，不值得同步到账号）；**没选过一律英文**
 * （2026-10-11 Kevin 定，不再按浏览器语言猜）。选过的人照旧用自己选的。
 * ⚠️ index.html 的 <html lang> 与 <title> 也写成英文，与这里的默认值保持一致，
 *    否则 React 挂载前会先闪一下中文标题。
 */

import { useEffect, useMemo, useState } from 'react'
import { I18nCtx } from './i18n-context'
import { MESSAGES, type Lang } from './messages'

const KEY = 'anime-rec:lang:v1'
const DEFAULT_LANG: Lang = 'en'

function initialLang(): Lang {
  try {
    const saved = localStorage.getItem(KEY)
    if (saved === 'zh' || saved === 'en') return saved
  } catch {
    /* 隐私模式等读不了 localStorage，走默认值 */
  }
  return DEFAULT_LANG
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>(initialLang)

  useEffect(() => {
    // <html lang> 影响读屏的发音与浏览器的断词/字体选择，不只是装饰。
    document.documentElement.lang = MESSAGES[lang].locale
    document.title = MESSAGES[lang].nav.brand
  }, [lang])

  const value = useMemo(
    () => ({
      lang,
      t: MESSAGES[lang],
      setLang: (l: Lang) => {
        setLangState(l)
        try {
          localStorage.setItem(KEY, l)
        } catch {
          /* 存不了就只在本次会话生效 */
        }
      },
    }),
    [lang],
  )

  return <I18nCtx.Provider value={value}>{children}</I18nCtx.Provider>
}
