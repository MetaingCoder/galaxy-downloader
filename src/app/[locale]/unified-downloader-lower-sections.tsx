'use client';

import type { ReactNode, RefObject } from 'react';
import type { HomeDictionary } from '@/lib/i18n/types';
import type { UnifiedParseResult } from '@/lib/types';
import { ResultCard } from '@/components/downloader/ResultCard';
import { DownloadHistory, type DownloadRecord } from './download-history';

interface UnifiedDownloaderLowerSectionsProps {
    dict: HomeDictionary;
    parseResult: UnifiedParseResult['data'] | null;
    onCloseParseResult: () => void;
    mobileAd?: ReactNode;
    mobileGuides?: ReactNode;
    downloadHistory: DownloadRecord[];
    clearHistory: () => void;
    onRedownload: (url: string) => void;
    historyRef: RefObject<HTMLDivElement | null>;
    historyHydrated: boolean;
}

export function UnifiedDownloaderLowerSections({
    dict,
    parseResult,
    onCloseParseResult,
    mobileAd,
    mobileGuides,
    downloadHistory,
    clearHistory,
    onRedownload,
    historyRef,
    historyHydrated,
}: UnifiedDownloaderLowerSectionsProps) {
    const hasDownloadHistory = downloadHistory.length > 0;

    return (
        <>
            {parseResult && (
                <ResultCard
                    result={parseResult}
                    onClose={onCloseParseResult}
                    dict={dict}
                />
            )}

            {mobileAd && <div className="lg:hidden min-h-[250px] overflow-hidden">{mobileAd}</div>}

            <div ref={historyRef}>
                {hasDownloadHistory ? (
                    <DownloadHistory
                        dict={dict}
                        downloadHistory={downloadHistory}
                        clearHistory={clearHistory}
                        onRedownload={onRedownload}
                        defaultOpen={false}
                    />
                ) : !historyHydrated ? (
                    <div className="min-h-[84px]" aria-hidden />
                ) : null}
            </div>

            {mobileGuides && <div className="lg:hidden flex flex-col gap-4">{mobileGuides}</div>}
        </>
    );
}
