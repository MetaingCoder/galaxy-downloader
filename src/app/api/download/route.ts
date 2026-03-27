import { NextRequest } from "next/server"

import { proxyUpstreamApi } from "@/lib/upstream-api-proxy"

function proxyDownload(request: NextRequest): Promise<Response> {
    return proxyUpstreamApi(request, "/api/download")
}

export const GET = proxyDownload
export const POST = proxyDownload
export const PUT = proxyDownload
export const PATCH = proxyDownload
export const DELETE = proxyDownload
export const OPTIONS = proxyDownload
export const HEAD = proxyDownload
