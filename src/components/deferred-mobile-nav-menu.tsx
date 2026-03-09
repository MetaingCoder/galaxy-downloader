'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Locale } from '@/lib/i18n/config'
import type { HomeDictionary } from '@/lib/i18n/types'

const MobileNavMenu = dynamic(
    () => import('@/components/mobile-nav-menu').then((m) => m.MobileNavMenu),
    { ssr: false }
)

interface DeferredMobileNavMenuProps {
    locale: Locale
    dict: HomeDictionary
}

export function DeferredMobileNavMenu({ locale, dict }: DeferredMobileNavMenuProps) {
    const [mounted, setMounted] = useState(false)

    if (mounted) {
        return <MobileNavMenu locale={locale} dict={dict} defaultOpen />
    }

    return (
        <Button
            variant="ghost"
            size="icon"
            onClick={() => setMounted(true)}
            aria-label={dict.page.openMenuLabel}
        >
            <Menu className="h-5 w-5" />
        </Button>
    )
}
