// Tiny typed i18n layer. The locale is fixed at page load (switching reloads
// the page), so `L` is a plain constant — no reactivity needed anywhere.

import { en, type Strings } from './en'
import { he } from './he'
import { ar } from './ar'

export type Locale = 'en' | 'he' | 'ar'

const KEY = 'poker-tutor/locale'
const LOCALES: Locale[] = ['en', 'he', 'ar']

export function getLocale(): Locale {
  if (typeof window === 'undefined') return 'en'
  const stored = window.localStorage.getItem(KEY)
  return LOCALES.includes(stored as Locale) ? (stored as Locale) : 'en'
}

export function setLocale(locale: Locale): void {
  window.localStorage.setItem(KEY, locale)
  window.location.reload()
}

/** The language the toggle button switches TO (en → he → ar → en). */
export function nextLocale(): Locale {
  return LOCALES[(LOCALES.indexOf(getLocale()) + 1) % LOCALES.length]
}

export function isRTL(): boolean {
  const l = getLocale()
  return l === 'he' || l === 'ar'
}

const DICTS: Record<Locale, Strings> = { en, he, ar }

export const L: Strings = DICTS[getLocale()]
