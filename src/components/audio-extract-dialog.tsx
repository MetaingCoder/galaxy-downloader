'use client'

import { useEffect, useMemo, useState, useCallback, useId, type ChangeEvent, type DragEvent } from 'react'
import { AlertCircle, CheckCircle2, FileX, Loader2, Music, Upload } from 'lucide-react'

import { Button, buttonVariants } from '@/components/ui/button'
import * as Tabs from '@radix-ui/react-tabs'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Progress } from '@/components/ui/progress'
import { Textarea } from '@/components/ui/textarea'
import { useFFmpeg, type FFmpegStatus } from '@/hooks/use-ffmpeg'
import { useDictionary } from '@/i18n/client'
import { ApiRequestError, isApiRequestError, resolveApiErrorMessage } from '@/lib/api-errors'
import { API_ENDPOINTS } from '@/lib/config'
import { toast } from '@/lib/deferred-toast'
import type { UnifiedParseResult } from '@/lib/types'
import { cn, downloadFile, formatBytes } from '@/lib/utils'

interface AudioExtractDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    entry?: 'toolbar' | 'result'
    autoExtractTask?: {
        title?: string
        sourceUrl?: string | null
        audioUrl?: string | null
        videoUrl?: string | null
    } | null
}

type ExtractMode = 'url' | 'file' | 'merge'
type AudioToolStage =
    | 'idle'
    | 'parsing'
    | 'direct-downloading'
    | 'fallback-extracting'
    | 'reading-file'
    | 'completed'
    | 'error'

type UnifiedParseSuccessResult = UnifiedParseResult & {
    success: true
    data: NonNullable<UnifiedParseResult['data']>
}

const MAX_VIDEO_FILE_SIZE = 500 * 1024 * 1024
const MAX_AUDIO_FILE_SIZE = 100 * 1024 * 1024
const MAX_TOTAL_MERGE_SIZE = 800 * 1024 * 1024

const SUPPORTED_VIDEO_TYPES = new Set([
    'video/mp4',
    'video/webm',
    'video/quicktime',
    'video/x-matroska',
    'video/avi',
    'video/mpeg',
])

const SUPPORTED_AUDIO_TYPES = new Set([
    'audio/mpeg',
    'audio/mp3',
    'audio/aac',
    'audio/x-aac',
    'audio/wav',
    'audio/x-wav',
    'audio/wave',
    'audio/ogg',
    'audio/flac',
    'audio/x-flac',
    'audio/mp4',
    'audio/x-m4a',
])

const VIDEO_EXTENSIONS = new Set(['mp4', 'webm', 'mov', 'mkv', 'avi', 'mpeg', 'mpg'])
const AUDIO_EXTENSIONS = new Set(['mp3', 'aac', 'wav', 'ogg', 'flac', 'm4a'])

async function requestUnifiedParse(videoUrl: string): Promise<UnifiedParseSuccessResult> {
    const params = new URLSearchParams({ url: videoUrl })
    const requestUrl = `${API_ENDPOINTS.unified.parse}?${params.toString()}`
    const response = await fetch(requestUrl, {
        method: 'GET',
        cache: 'no-store',
    })

    let payload: UnifiedParseResult | null = null
    try {
        payload = await response.json() as UnifiedParseResult
    } catch {
        throw new ApiRequestError({
            status: response.status,
        })
    }

    if (!response.ok || !payload?.success || !payload.data) {
        throw new ApiRequestError({
            code: payload?.code,
            status: payload?.status ?? response.status,
            requestId: payload?.requestId,
            details: payload?.details,
            fallbackMessage: payload?.error || payload?.message,
        })
    }

    return payload as UnifiedParseSuccessResult
}

function getFileExtension(file: File): string {
    const match = /\.([a-z0-9]+)$/i.exec(file.name)
    return match?.[1]?.toLowerCase() ?? ''
}

function isSupportedVideoFile(file: File): boolean {
    const extension = getFileExtension(file)
    if (VIDEO_EXTENSIONS.has(extension)) {
        return true
    }

    return !!file.type && (SUPPORTED_VIDEO_TYPES.has(file.type) || file.type.startsWith('video/'))
}

function isSupportedAudioFile(file: File): boolean {
    const extension = getFileExtension(file)
    if (AUDIO_EXTENSIONS.has(extension)) {
        return true
    }

    return !!file.type && (SUPPORTED_AUDIO_TYPES.has(file.type) || file.type.startsWith('audio/'))
}

interface FileDropzoneProps {
    acceptedFile: File | null
    title: string
    hint: string
    limitText: string
    emptyButtonLabel: string
    selectedLabel: string
    inputId: string
    accept: string
    isBusy: boolean
    onSelect: (event: ChangeEvent<HTMLInputElement>) => void
    onDrop: (event: DragEvent<HTMLDivElement>) => void
    onDragOver: (event: DragEvent<HTMLDivElement>) => void
    onClear: () => void
}

function FileDropzone({
    acceptedFile,
    title,
    hint,
    limitText,
    emptyButtonLabel,
    selectedLabel,
    inputId,
    accept,
    isBusy,
    onSelect,
    onDrop,
    onDragOver,
    onClear,
}: FileDropzoneProps) {
    return (
        <div
            className={cn(
                'border-2 border-dashed rounded-lg p-4 text-center transition-colors space-y-3',
                acceptedFile ? 'border-muted bg-muted/20' : 'border-muted-foreground/30 hover:border-muted-foreground/50'
            )}
            onDrop={onDrop}
            onDragOver={onDragOver}
        >
            <div className="space-y-1">
                <div className="text-sm font-medium">{title}</div>
                <div className="text-xs text-muted-foreground">{hint}</div>
                <div className="text-xs text-muted-foreground/80">{limitText}</div>
            </div>

            <input
                id={inputId}
                type="file"
                accept={accept}
                onChange={onSelect}
                disabled={isBusy}
                className="sr-only"
            />

            {acceptedFile ? (
                <div className="space-y-3">
                    <p className="text-sm font-medium break-all">{selectedLabel}</p>
                    <div className="flex justify-center gap-2">
                        <label
                            htmlFor={inputId}
                            aria-disabled={isBusy}
                            className={cn(
                                buttonVariants({ variant: 'outline', size: 'sm' }),
                                'cursor-pointer',
                                isBusy && 'pointer-events-none opacity-50'
                            )}
                        >
                            {emptyButtonLabel}
                        </label>
                        <Button type="button" variant="ghost" size="sm" onClick={onClear} disabled={isBusy} className="h-8 w-8 p-0">
                            <FileX className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            ) : (
                <div className="space-y-2 py-2">
                    <Upload className="mx-auto h-8 w-8 text-muted-foreground/60" />
                    <label
                        htmlFor={inputId}
                        aria-disabled={isBusy}
                        className={cn(
                            buttonVariants({ variant: 'outline', size: 'sm' }),
                            'cursor-pointer',
                            isBusy && 'pointer-events-none opacity-50'
                        )}
                    >
                        {emptyButtonLabel}
                    </label>
                </div>
            )}
        </div>
    )
}

export function AudioExtractDialog({
    open,
    onOpenChange,
    entry = 'toolbar',
    autoExtractTask = null,
}: AudioExtractDialogProps) {
    const dict = useDictionary()
    const extractFileInputId = useId()
    const mergeVideoInputId = useId()
    const mergeAudioInputId = useId()
    const [mode, setMode] = useState<ExtractMode>('url')
    const [url, setUrl] = useState('')
    const [selectedFile, setSelectedFile] = useState<File | null>(null)
    const [mergeVideoFile, setMergeVideoFile] = useState<File | null>(null)
    const [mergeAudioFile, setMergeAudioFile] = useState<File | null>(null)
    const [stage, setStage] = useState<AudioToolStage>('idle')
    const [errorMessage, setErrorMessage] = useState('')
    const { status, progress, progressInfo, error, extractAudio, extractAudioFromFile, mergeVideoAndAudio, reset, cancel } = useFFmpeg()
    const isToolbarEntry = entry === 'toolbar'
    const autoTaskKey = autoExtractTask
        ? `${autoExtractTask.audioUrl ?? ''}::${autoExtractTask.videoUrl ?? ''}::${autoExtractTask.sourceUrl ?? ''}::${autoExtractTask.title ?? ''}`
        : null

    const ffmpegProcessing = useMemo(
        () => ([
            'loading',
            'downloading',
            'converting',
            'reading-video',
            'reading-audio',
            'merging',
        ] as FFmpegStatus[]).includes(status),
        [status]
    )
    const showProgress = ffmpegProcessing
    const isBusy = stage === 'parsing' || stage === 'direct-downloading' || stage === 'reading-file' || ffmpegProcessing
    const toolbarDescription = mode === 'merge'
        ? dict.audioTool.mergeDescription
        : dict.audioTool.extractDescription

    const setValidationError = useCallback((message: string) => {
        setStage('error')
        setErrorMessage(message)
        toast.error(message)
    }, [])

    const validateMergeTotalSize = useCallback((videoFile: File | null, audioFile: File | null): boolean => {
        const totalSize = (videoFile?.size ?? 0) + (audioFile?.size ?? 0)
        if (totalSize > MAX_TOTAL_MERGE_SIZE) {
            setValidationError(dict.errors.totalSizeTooLarge)
            return false
        }

        return true
    }, [dict.errors.totalSizeTooLarge, setValidationError])

    const validateExtractVideoFile = useCallback((file: File): boolean => {
        if (file.size > MAX_VIDEO_FILE_SIZE) {
            setValidationError(dict.errors.fileTooLarge)
            return false
        }

        if (file.size === 0) {
            setValidationError(dict.errors.fileEmpty)
            return false
        }

        if (!isSupportedVideoFile(file)) {
            setValidationError(dict.errors.fileFormatNotSupported)
            return false
        }

        return true
    }, [dict.errors.fileEmpty, dict.errors.fileFormatNotSupported, dict.errors.fileTooLarge, setValidationError])

    const validateMergeVideoFile = useCallback((file: File): boolean => {
        if (file.size > MAX_VIDEO_FILE_SIZE) {
            setValidationError(dict.errors.videoFileTooLarge)
            return false
        }

        if (file.size === 0) {
            setValidationError(dict.errors.fileEmpty)
            return false
        }

        if (!isSupportedVideoFile(file)) {
            setValidationError(dict.errors.fileFormatNotSupported)
            return false
        }

        return true
    }, [dict.errors.fileEmpty, dict.errors.fileFormatNotSupported, dict.errors.videoFileTooLarge, setValidationError])

    const validateMergeAudioFile = useCallback((file: File): boolean => {
        if (file.size > MAX_AUDIO_FILE_SIZE) {
            setValidationError(dict.errors.audioFileTooLarge)
            return false
        }

        if (file.size === 0) {
            setValidationError(dict.errors.fileEmpty)
            return false
        }

        if (!isSupportedAudioFile(file)) {
            setValidationError(dict.errors.audioFormatNotSupported)
            return false
        }

        return true
    }, [dict.errors.audioFileTooLarge, dict.errors.audioFormatNotSupported, dict.errors.fileEmpty, setValidationError])

    const statusText = useMemo(() => {
        if (mode === 'merge') {
            if (status === 'loading') {
                return dict.extractAudio.loading
            }

            if (status === 'reading-video') {
                return dict.audioTool.statusReadingVideo
            }

            if (status === 'reading-audio') {
                return dict.audioTool.statusReadingAudio
            }

            if (status === 'merging') {
                return dict.audioTool.statusMerging
            }

            return dict.audioTool.statusMergeIdle
        }

        if (mode === 'file') {
            if (stage === 'reading-file') {
                return dict.audioTool.statusReadingFile
            }

            if (selectedFile && stage === 'idle') {
                return dict.audioTool.statusFileReady
            }
        }

        if (stage === 'parsing') {
            return dict.audioTool.statusParsing
        }

        if (stage === 'direct-downloading') {
            return dict.audioTool.statusDirectDownloading
        }

        if (status === 'loading') {
            return dict.extractAudio.loading
        }

        if (status === 'downloading') {
            if (progressInfo?.loaded && progressInfo?.total && dict.extractAudio.downloadingWithSize) {
                return dict.extractAudio.downloadingWithSize
                    .replace('{progress}', String(Math.floor(progress)))
                    .replace('{loaded}', formatBytes(progressInfo.loaded))
                    .replace('{total}', formatBytes(progressInfo.total))
            }

            return dict.extractAudio.downloading.replace('{progress}', String(Math.floor(progress)))
        }

        if (status === 'converting') {
            return dict.extractAudio.converting.replace('{progress}', String(Math.floor(progress)))
        }

        if (stage === 'fallback-extracting') {
            return dict.audioTool.statusFallbackExtracting
        }

        if (stage === 'completed' || status === 'completed') {
            return dict.audioTool.statusCompleted
        }

        if (stage === 'error' || status === 'error') {
            return errorMessage || error || dict.errors.downloadError
        }

        return dict.audioTool.statusIdle
    }, [
        dict,
        error,
        errorMessage,
        mode,
        progress,
        progressInfo?.loaded,
        progressInfo?.total,
        selectedFile,
        stage,
        status,
    ])

    useEffect(() => {
        if (status === 'completed') {
            setStage('completed')
        }

        if (status === 'error') {
            setStage('error')
            if (error) {
                setErrorMessage(error)
            }
        }
    }, [error, status])

    useEffect(() => {
        if (!open) {
            const timer = window.setTimeout(() => {
                setUrl('')
                setSelectedFile(null)
                setMergeVideoFile(null)
                setMergeAudioFile(null)
                setStage('idle')
                setErrorMessage('')
                setMode(isToolbarEntry ? 'file' : 'url')
                reset()
            }, 150)

            return () => window.clearTimeout(timer)
        }
    }, [isToolbarEntry, open, reset])

    useEffect(() => {
        if (!open) {
            return
        }

        if (isToolbarEntry && mode === 'url') {
            setMode('file')
        }
    }, [isToolbarEntry, mode, open])

    const handlePaste = async () => {
        try {
            const text = await navigator.clipboard.readText()
            setUrl(text)
            toast.success(dict.toast.linkFilled)
        } catch (err) {
            console.error('Failed to read clipboard:', err)
            toast.error(dict.errors.clipboardFailed, {
                description: dict.errors.clipboardPermission,
            })
        }
    }

    const handleExtractUrl = async () => {
        if (!url.trim()) {
            setValidationError(dict.errors.emptyUrl)
            return
        }

        if (status === 'error') {
            reset()
        }

        setStage('parsing')
        setErrorMessage('')

        try {
            const apiResult = await requestUnifiedParse(url.trim())
            const parsed = apiResult.data
            const audioDownloadUrl = parsed.downloadAudioUrl || parsed.originDownloadAudioUrl || null
            const videoDownloadUrl = parsed.downloadVideoUrl || parsed.originDownloadVideoUrl || null
            const outputTitle = parsed.title || parsed.desc || dict.history.unknownTitle

            if (audioDownloadUrl) {
                setStage('direct-downloading')
                downloadFile(audioDownloadUrl)
                setStage('completed')
                setUrl('')
                return
            }

            if (!videoDownloadUrl) {
                throw new Error(dict.audioTool.noAudioSource)
            }

            setStage('fallback-extracting')
            await extractAudio(videoDownloadUrl, outputTitle)
            setUrl('')
        } catch (err) {
            if (isApiRequestError(err)) {
                console.error('Audio tool parse failed', {
                    code: err.code,
                    status: err.status,
                    requestId: err.requestId,
                    details: err.details,
                })
            }

            const resolvedMessage = resolveApiErrorMessage(err, dict)
            setStage('error')
            setErrorMessage(resolvedMessage)
            toast.error(dict.errors.downloadFailed, {
                description: resolvedMessage,
            })
        }
    }

    const runAutoExtractTask = useCallback(async (task: NonNullable<AudioExtractDialogProps['autoExtractTask']>) => {
        if (status === 'error') {
            reset()
        }

        setErrorMessage('')

        try {
            const outputTitle = task.title || dict.history.unknownTitle

            if (task.audioUrl) {
                setStage('direct-downloading')
                downloadFile(task.audioUrl)
                setStage('completed')
                return
            }

            if (task.videoUrl) {
                setStage('fallback-extracting')
                await extractAudio(task.videoUrl, outputTitle)
                return
            }

            if (!task.sourceUrl?.trim()) {
                setValidationError(dict.audioTool.noAudioSource)
                return
            }

            setStage('parsing')
            const apiResult = await requestUnifiedParse(task.sourceUrl.trim())
            const parsed = apiResult.data
            const audioDownloadUrl = parsed.downloadAudioUrl || parsed.originDownloadAudioUrl || null
            const videoDownloadUrl = parsed.downloadVideoUrl || parsed.originDownloadVideoUrl || null
            const resolvedTitle = parsed.title || parsed.desc || outputTitle

            if (audioDownloadUrl) {
                setStage('direct-downloading')
                downloadFile(audioDownloadUrl)
                setStage('completed')
                return
            }

            if (!videoDownloadUrl) {
                throw new Error(dict.audioTool.noAudioSource)
            }

            setStage('fallback-extracting')
            await extractAudio(videoDownloadUrl, resolvedTitle)
        } catch (err) {
            if (isApiRequestError(err)) {
                console.error('Audio tool auto parse failed', {
                    code: err.code,
                    status: err.status,
                    requestId: err.requestId,
                    details: err.details,
                })
            }

            const resolvedMessage = resolveApiErrorMessage(err, dict)
            setStage('error')
            setErrorMessage(resolvedMessage)
            toast.error(dict.errors.downloadFailed, {
                description: resolvedMessage,
            })
        }
    }, [dict, extractAudio, reset, setValidationError, status])

    const handleExtractFileSelect = useCallback((event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]
        if (!file) return

        setErrorMessage('')
        setStage('idle')

        if (!validateExtractVideoFile(file)) {
            setSelectedFile(null)
            event.target.value = ''
            return
        }

        setSelectedFile(file)
    }, [validateExtractVideoFile])

    const handleExtractFileDrop = useCallback((event: DragEvent<HTMLDivElement>) => {
        event.preventDefault()
        event.stopPropagation()

        const file = event.dataTransfer.files?.[0]
        if (!file) return

        setErrorMessage('')
        setStage('idle')

        if (!validateExtractVideoFile(file)) {
            setSelectedFile(null)
            return
        }

        setSelectedFile(file)
    }, [validateExtractVideoFile])

    const handleMergeVideoSelect = useCallback((event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]
        if (!file) return

        setErrorMessage('')
        setStage('idle')

        if (!validateMergeVideoFile(file) || !validateMergeTotalSize(file, mergeAudioFile)) {
            event.target.value = ''
            return
        }

        setMergeVideoFile(file)
    }, [mergeAudioFile, validateMergeTotalSize, validateMergeVideoFile])

    const handleMergeAudioSelect = useCallback((event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]
        if (!file) return

        setErrorMessage('')
        setStage('idle')

        if (!validateMergeAudioFile(file) || !validateMergeTotalSize(mergeVideoFile, file)) {
            event.target.value = ''
            return
        }

        setMergeAudioFile(file)
    }, [mergeVideoFile, validateMergeAudioFile, validateMergeTotalSize])

    const handleMergeVideoDrop = useCallback((event: DragEvent<HTMLDivElement>) => {
        event.preventDefault()
        event.stopPropagation()

        const file = event.dataTransfer.files?.[0]
        if (!file) return

        setErrorMessage('')
        setStage('idle')

        if (!validateMergeVideoFile(file) || !validateMergeTotalSize(file, mergeAudioFile)) {
            return
        }

        setMergeVideoFile(file)
    }, [mergeAudioFile, validateMergeTotalSize, validateMergeVideoFile])

    const handleMergeAudioDrop = useCallback((event: DragEvent<HTMLDivElement>) => {
        event.preventDefault()
        event.stopPropagation()

        const file = event.dataTransfer.files?.[0]
        if (!file) return

        setErrorMessage('')
        setStage('idle')

        if (!validateMergeAudioFile(file) || !validateMergeTotalSize(mergeVideoFile, file)) {
            return
        }

        setMergeAudioFile(file)
    }, [mergeVideoFile, validateMergeAudioFile, validateMergeTotalSize])

    const handleDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
        event.preventDefault()
        event.stopPropagation()
    }, [])

    const handleClearExtractFile = useCallback(() => {
        setSelectedFile(null)
        setErrorMessage('')
        setStage('idle')
        reset()
    }, [reset])

    const handleClearMergeVideo = useCallback(() => {
        setMergeVideoFile(null)
        setErrorMessage('')
        setStage('idle')
        reset()
    }, [reset])

    const handleClearMergeAudio = useCallback(() => {
        setMergeAudioFile(null)
        setErrorMessage('')
        setStage('idle')
        reset()
    }, [reset])

    const handleExtractFile = async () => {
        if (!selectedFile) {
            setValidationError(dict.errors.emptyUrl)
            return
        }

        if (status === 'error') {
            reset()
        }

        setStage('reading-file')
        setErrorMessage('')
        await extractAudioFromFile(selectedFile, selectedFile.name.replace(/\.[^.]+$/, ''))
    }

    const handleMerge = async () => {
        if (!mergeVideoFile) {
            setValidationError(dict.errors.noVideoSelected)
            return
        }

        if (!mergeAudioFile) {
            setValidationError(dict.errors.noAudioSelected)
            return
        }

        if (!validateMergeTotalSize(mergeVideoFile, mergeAudioFile)) {
            return
        }

        if (status === 'error') {
            reset()
        }

        setStage('idle')
        setErrorMessage('')
        await mergeVideoAndAudio(mergeVideoFile, mergeAudioFile, mergeVideoFile.name.replace(/\.[^.]+$/, ''))
    }

    useEffect(() => {
        if (!open || entry !== 'result' || !autoExtractTask || !autoTaskKey) {
            return
        }

        if (stage !== 'idle' || ffmpegProcessing || status === 'completed') {
            return
        }

        void runAutoExtractTask(autoExtractTask)
    }, [autoExtractTask, autoTaskKey, entry, ffmpegProcessing, open, runAutoExtractTask, stage, status])

    const handleDialogOpenChange = useCallback((nextOpen: boolean) => {
        if (!nextOpen) {
            cancel()
        }

        onOpenChange(nextOpen)
    }, [cancel, onOpenChange])

    const statusPanel = (
        <div className="rounded-md border bg-muted/30 p-3 space-y-2">
            <div className="flex items-start gap-2 text-sm">
                {(stage === 'error' || status === 'error') ? (
                    <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                ) : (stage === 'completed' || status === 'completed') ? (
                    <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                ) : ffmpegProcessing || stage === 'parsing' || stage === 'direct-downloading' || stage === 'reading-file' ? (
                    <Loader2 className="h-4 w-4 animate-spin mt-0.5 shrink-0" />
                ) : (
                    <Music className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                )}
                <p className={(stage === 'error' || status === 'error') ? 'text-destructive' : 'text-foreground/80'}>
                    {statusText}
                </p>
            </div>

            {showProgress && (
                <Progress value={Math.floor(progress)} className="h-2" />
            )}
        </div>
    )

    return (
        <Dialog open={open} onOpenChange={handleDialogOpenChange}>
            <DialogContent
                className="flex max-h-[calc(100vh-2rem)] max-w-2xl flex-col overflow-hidden p-4 sm:max-h-[90vh] sm:p-6"
                onInteractOutside={(event) => {
                    event.preventDefault()
                }}
            >
                <DialogHeader>
                    <DialogTitle>{entry === 'result' ? dict.extractAudio.button : dict.audioTool.title}</DialogTitle>
                    <DialogDescription>
                        {entry === 'result'
                            ? (autoExtractTask?.title || autoExtractTask?.videoUrl || dict.history.unknownTitle)
                            : toolbarDescription}
                    </DialogDescription>
                </DialogHeader>

                <div
                    className="flex-1 min-h-0 overflow-y-auto pr-1"
                    style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 0px)' }}
                >
                    {entry === 'result' ? (
                        <div className="space-y-4">
                            <div className="rounded-md border bg-muted/20 px-3 py-2 text-xs text-muted-foreground break-all">
                                {autoExtractTask?.sourceUrl || autoExtractTask?.videoUrl || autoExtractTask?.audioUrl}
                            </div>

                            {stage === 'error' && autoExtractTask && (
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="w-full"
                                    onClick={() => void runAutoExtractTask(autoExtractTask)}
                                    disabled={isBusy}
                                >
                                    {dict.extractAudio.retry}
                                </Button>
                            )}

                            {statusPanel}
                        </div>
                    ) : (
                        <Tabs.Root value={mode} onValueChange={(value) => setMode(value as ExtractMode)} className="space-y-4">
                            <Tabs.List className="grid grid-cols-2 rounded-lg bg-muted p-1">
                                <Tabs.Trigger
                                    value="file"
                                    className={cn(
                                        'inline-flex items-center justify-center rounded-md px-3 py-1.5 text-sm font-medium transition-all',
                                        mode === 'file'
                                            ? 'bg-background text-foreground shadow-sm'
                                            : 'text-muted-foreground hover:text-foreground'
                                    )}
                                >
                                    {dict.audioTool.fileTab}
                                </Tabs.Trigger>
                                <Tabs.Trigger
                                    value="merge"
                                    className={cn(
                                        'inline-flex items-center justify-center rounded-md px-3 py-1.5 text-sm font-medium transition-all',
                                        mode === 'merge'
                                            ? 'bg-background text-foreground shadow-sm'
                                            : 'text-muted-foreground hover:text-foreground'
                                    )}
                                >
                                    {dict.audioTool.mergeTab}
                                </Tabs.Trigger>
                            </Tabs.List>

                            <Tabs.Content value="file" className="space-y-4 focus:outline-none">
                                <FileDropzone
                                    acceptedFile={selectedFile}
                                    title={dict.audioTool.videoFile}
                                    hint={dict.audioTool.dropHint}
                                    limitText={dict.audioTool.fileSizeLimit}
                                    emptyButtonLabel={selectedFile ? dict.audioTool.changeFileButton : dict.audioTool.selectFileButton}
                                    selectedLabel={selectedFile
                                        ? dict.audioTool.fileSelected
                                            .replace('{name}', selectedFile.name)
                                            .replace('{size}', formatBytes(selectedFile.size))
                                        : ''}
                                    inputId={extractFileInputId}
                                    accept="video/*,.mp4,.webm,.mov,.mkv,.avi,.mpeg,.mpg"
                                    isBusy={isBusy}
                                    onSelect={handleExtractFileSelect}
                                    onDrop={handleExtractFileDrop}
                                    onDragOver={handleDragOver}
                                    onClear={handleClearExtractFile}
                                />

                                {statusPanel}

                                <Button
                                    type="button"
                                    className="w-full flex items-center justify-center gap-2"
                                    onClick={handleExtractFile}
                                    disabled={isBusy || !selectedFile}
                                >
                                    {isBusy && <Loader2 className="h-4 w-4 animate-spin" />}
                                    {isBusy ? dict.audioTool.processingButton : dict.audioTool.submitButton}
                                </Button>
                            </Tabs.Content>

                            <Tabs.Content value="merge" className="space-y-4 focus:outline-none">
                                <div className="grid gap-4 md:grid-cols-2">
                                    <FileDropzone
                                        acceptedFile={mergeVideoFile}
                                        title={dict.audioTool.videoFile}
                                        hint={dict.audioTool.dropHint}
                                        limitText={dict.audioTool.videoSizeLimit}
                                        emptyButtonLabel={mergeVideoFile ? dict.audioTool.changeVideoButton : dict.audioTool.selectVideoButton}
                                        selectedLabel={mergeVideoFile
                                            ? dict.audioTool.videoSelected
                                                .replace('{name}', mergeVideoFile.name)
                                                .replace('{size}', formatBytes(mergeVideoFile.size))
                                            : ''}
                                        inputId={mergeVideoInputId}
                                        accept="video/*,.mp4,.webm,.mov,.mkv,.avi,.mpeg,.mpg"
                                        isBusy={isBusy}
                                        onSelect={handleMergeVideoSelect}
                                        onDrop={handleMergeVideoDrop}
                                        onDragOver={handleDragOver}
                                        onClear={handleClearMergeVideo}
                                    />

                                    <FileDropzone
                                        acceptedFile={mergeAudioFile}
                                        title={dict.audioTool.audioFile}
                                        hint={dict.audioTool.dropHint}
                                        limitText={dict.audioTool.audioSizeLimit}
                                        emptyButtonLabel={mergeAudioFile ? dict.audioTool.changeAudioButton : dict.audioTool.selectAudioButton}
                                        selectedLabel={mergeAudioFile
                                            ? dict.audioTool.audioSelected
                                                .replace('{name}', mergeAudioFile.name)
                                                .replace('{size}', formatBytes(mergeAudioFile.size))
                                            : ''}
                                        inputId={mergeAudioInputId}
                                        accept="audio/*,.mp3,.aac,.wav,.ogg,.flac,.m4a"
                                        isBusy={isBusy}
                                        onSelect={handleMergeAudioSelect}
                                        onDrop={handleMergeAudioDrop}
                                        onDragOver={handleDragOver}
                                        onClear={handleClearMergeAudio}
                                    />
                                </div>

                                {statusPanel}

                                <Button
                                    type="button"
                                    className="w-full flex items-center justify-center gap-2"
                                    onClick={handleMerge}
                                    disabled={isBusy || !mergeVideoFile || !mergeAudioFile}
                                >
                                    {isBusy && <Loader2 className="h-4 w-4 animate-spin" />}
                                    {isBusy ? dict.audioTool.processingButton : dict.audioTool.mergeButton}
                                </Button>
                            </Tabs.Content>
                        </Tabs.Root>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}
