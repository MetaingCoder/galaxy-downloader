import type { Locale } from '@/lib/i18n/config'

export type ApiLanguage = 'zh-CN' | 'zh-TW' | 'en'

const API_LANGUAGE_BY_LOCALE: Record<Locale, ApiLanguage> = {
    zh: 'zh-CN',
    'zh-tw': 'zh-TW',
    en: 'en',
}

const API_ACCEPT_LANGUAGE_BY_LOCALE: Record<Locale, string> = {
    zh: 'zh-CN,zh;q=0.9,en;q=0.6',
    'zh-tw': 'zh-TW,zh;q=0.9,zh-CN;q=0.8,en;q=0.6',
    en: 'en-US,en;q=0.9,zh-CN;q=0.6',
}

const API_I18N_HEADERS_BY_LOCALE: Record<Locale, Record<'x-lang' | 'Accept-Language', string>> = {
    zh: {
        'x-lang': API_LANGUAGE_BY_LOCALE.zh,
        'Accept-Language': API_ACCEPT_LANGUAGE_BY_LOCALE.zh,
    },
    'zh-tw': {
        'x-lang': API_LANGUAGE_BY_LOCALE['zh-tw'],
        'Accept-Language': API_ACCEPT_LANGUAGE_BY_LOCALE['zh-tw'],
    },
    en: {
        'x-lang': API_LANGUAGE_BY_LOCALE.en,
        'Accept-Language': API_ACCEPT_LANGUAGE_BY_LOCALE.en,
    },
}

export function localeToApiLanguage(locale: Locale): ApiLanguage {
    return API_LANGUAGE_BY_LOCALE[locale] ?? API_LANGUAGE_BY_LOCALE.en
}

export function buildApiAcceptLanguage(locale: Locale): string {
    return API_ACCEPT_LANGUAGE_BY_LOCALE[locale] ?? API_ACCEPT_LANGUAGE_BY_LOCALE.en
}

export function buildApiI18nHeaders(locale: Locale): Record<'x-lang' | 'Accept-Language', string> {
    return API_I18N_HEADERS_BY_LOCALE[locale] ?? API_I18N_HEADERS_BY_LOCALE.en
}

export function appendLangQuery(url: string, locale: Locale): string {
    const lang = localeToApiLanguage(locale)
    const [base, hash = ''] = url.split('#', 2)
    const [path, query = ''] = base.split('?', 2)
    const params = new URLSearchParams(query)
    params.set('lang', lang)

    const queryString = params.toString()
    const result = queryString ? `${path}?${queryString}` : path
    return hash ? `${result}#${hash}` : result
}
