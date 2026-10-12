/**
 * 把请求错误转成给用户看的一句话。
 *
 * 中文界面：直接透出后端 detail —— 它本来就是写给用户看的中文
 *           （「用户名或密码不正确」「24 小时内最多问 10 条…」）。
 * 英文界面：后端 detail 是中文，没法直接给 → **按 HTTP 状态码**给英文提示。
 *           同一个状态码在不同接口含义不同（登录的 401 是密码错，问答的 401
 *           是没登录），所以调用方用 `en` 传本接口的专属文案覆盖默认值。
 *
 * ⚠️ 不要按 detail 的中文内容做匹配 —— 后端改一个字就静默失配。
 *    状态码是接口契约的一部分，detail 不是。
 */

import { ApiError } from './api'
import { MESSAGES, type Lang } from './messages'

const EN_BY_STATUS: Record<number, string> = {
  401: 'Please log in first',
  403: 'Not allowed',
  404: 'Not found',
  409: 'Conflict — that value is already in use',
  422: 'Invalid input',
  429: 'Too many requests — please try again later',
  500: 'Server error — please try again later',
  503: 'Service temporarily unavailable — please try again later',
}

export function errorText(
  e: unknown,
  lang: Lang,
  en?: Partial<Record<number, string>>,
): string {
  const msg = e instanceof Error ? e.message : String(e)
  if (lang === 'zh') return msg
  if (e instanceof ApiError) {
    return en?.[e.status] ?? EN_BY_STATUS[e.status] ?? `Request failed (HTTP ${e.status})`
  }
  // fetch 自己抛的（断网、DNS、被拦）不是 ApiError。
  return MESSAGES.en.errors.network
}
