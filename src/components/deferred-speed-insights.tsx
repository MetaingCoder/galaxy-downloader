'use client'

import { useEffect, useState, type ComponentType } from 'react'

type SpeedInsightsComponent = ComponentType<Record<string, never>>

export function DeferredSpeedInsights() {
    const [SpeedInsights, setSpeedInsights] = useState<SpeedInsightsComponent | null>(null)

    useEffect(() => {
        let cancelled = false
        let loaded = false
        let timerId: ReturnType<typeof setTimeout> | null = null

        const loadSpeedInsights = async () => {
            try {
                const mod = await import('@vercel/speed-insights/next')
                if (!cancelled) {
                    setSpeedInsights(() => mod.SpeedInsights as SpeedInsightsComponent)
                }
            } catch {
                // Ignore optional telemetry load failures.
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
            void loadSpeedInsights()
        }

        window.addEventListener('pointerdown', triggerLoad, { passive: true })
        window.addEventListener('keydown', triggerLoad)
        window.addEventListener('touchstart', triggerLoad, { passive: true })

        timerId = setTimeout(() => {
            triggerLoad()
        }, 10000)

        return () => {
            cancelled = true
            cleanupListeners()
            if (timerId !== null) {
                clearTimeout(timerId)
            }
        }
    }, [])

    if (!SpeedInsights) {
        return null
    }

    return <SpeedInsights />
}
