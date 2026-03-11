'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { Globe, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useHomeDictionary, useHomeLocale } from '@/lib/i18n/home-context'

const LanguageSwitcher = dynamic(
    () => import('@/components/language-switcher').then((m) => m.LanguageSwitcher),
    { ssr: false }
)

interface DeferredLanguageSwitcherProps {
    compact?: boolean
}

export function DeferredLanguageSwitcher({
    compact = false,
}: DeferredLanguageSwitcherProps) {
    const currentLocale = useHomeLocale()
    const dict = useHomeDictionary()
    const [mounted, setMounted] = useState(false)

    if (mounted) {
        return (
            <LanguageSwitcher
                compact={compact}
                defaultOpen
            />
        )
    }

    return (
        <Button
            variant="ghost"
            size={compact ? 'icon' : 'sm'}
            onClick={() => setMounted(true)}
            className={cn('flex items-center gap-2 text-sm', compact && 'h-9 w-9 p-0')}
            aria-label={dict.languages[currentLocale]}
        >
            <Globe className="h-4 w-4" />
            {compact ? (
                <span className="sr-only">{dict.languages[currentLocale]}</span>
            ) : (
                <>
                    <span>{dict.languages[currentLocale]}</span>
                    <ChevronDown className="h-4 w-4" />
                </>
            )}
        </Button>
    )
}
