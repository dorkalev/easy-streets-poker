// Tiny typed i18n layer. The locale is fixed at page load (switching reloads
// the page), so `L` is a plain constant — no reactivity needed anywhere.

import { en, type Strings } from './en'
import { he } from './he'

export type Locale = 'en' | 'he'

const KEY = 'poker-tutor/locale'

export function getLocale(): Locale {
  if (typeof window === 'undefined') return 'en'
  return window.localStorage.getItem(KEY) === 'he' ? 'he' : 'en'
}

export function setLocale(locale: Locale): void {
  window.localStorage.setItem(KEY, locale)
  window.location.reload()
}

export function isRTL(): boolean {
  return getLocale() === 'he'
}

export const L: Strings = getLocale() === 'he' ? he : en
