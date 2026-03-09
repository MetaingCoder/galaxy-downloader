'use client'

import { useEffect, useState, type ComponentType } from 'react'

type TrackerComponent = ComponentType<Record<string, never>>

export function DeferredWebVitalsTracker() {
    const [Tracker, setTracker] = useState<TrackerComponent | null>(null)

    useEffect(() => {
        let cancelled = false
        let loaded = false
        let timerId: ReturnType<typeof setTimeout> | null = null

        const loadTracker = async () => {
            try {
                const mod = await import('@/components/web-vitals-tracker')
                if (!cancelled) {
                    setTracker(() => mod.WebVitalsTracker as TrackerComponent)
                }
            } catch {
                // Ignore tracker load failures to avoid impacting user actions.
            }
        }

        const cleanupListeners = () => {
            window.removeEventListener('pointerdown', triggerLoad)
            window.removeEventListener('keydown', triggerLoad)
            window.removeEventListener('touchstart', triggerLoad)
        }

        const triggerLoad = () => {
            if (loaded) {
                return
            }
            loaded = true
            cleanupListeners()
            void loadTracker()
        }

        window.addEventListener('pointerdown', triggerLoad, { passive: true })
        window.addEventListener('keydown', triggerLoad)
        window.addEventListener('touchstart', triggerLoad, { passive: true })

        timerId = setTimeout(() => {
            triggerLoad()
        }, 8000)

        return () => {
            cancelled = true
            cleanupListeners()
            if (timerId !== null) {
                clearTimeout(timerId)
            }
        }
    }, [])

    if (!Tracker) {
        return null
    }

    return <Tracker />
}
