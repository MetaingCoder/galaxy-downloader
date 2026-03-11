'use client'

import { createContext, useContext, type ReactNode } from 'react'
import type { Locale } from './config'
import type { HomeDictionary } from './types'

interface HomeI18nValue {
    locale: Locale
    dict: HomeDictionary
}

const HomeI18nContext = createContext<HomeI18nValue | null>(null)

interface HomeI18nProviderProps {
    locale: Locale
    dict: HomeDictionary
    children: ReactNode
}

export function HomeI18nProvider({ locale, dict, children }: HomeI18nProviderProps) {
    return (
        <HomeI18nContext.Provider value={{ locale, dict }}>
            {children}
        </HomeI18nContext.Provider>
    )
}

function useHomeI18nContext(): HomeI18nValue {
    const context = useContext(HomeI18nContext)
    if (!context) {
        throw new Error('useHomeI18n must be used within HomeI18nProvider')
    }
    return context
}

export function useHomeI18n() {
    return useHomeI18nContext()
}

export function useHomeDictionary() {
    return useHomeI18nContext().dict
}

export function useHomeLocale() {
    return useHomeI18nContext().locale
}
