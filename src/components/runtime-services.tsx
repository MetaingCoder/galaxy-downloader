'use client'

import { DeferredAdSenseScript } from '@/components/deferred-adsense-script'
import { DeferredGoogleAnalyticsScript } from '@/components/deferred-google-analytics-script'
import { ServiceWorkerRegistration } from '@/components/service-worker-registration'

export function RuntimeServices() {
    return (
        <>
            <ServiceWorkerRegistration />
            <DeferredAdSenseScript />
            <DeferredGoogleAnalyticsScript />
        </>
    )
}
