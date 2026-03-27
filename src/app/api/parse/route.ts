import { NextRequest } from "next/server"

import { proxyUpstreamApi } from "@/lib/upstream-api-proxy"

function proxyParse(request: NextRequest): Promise<Response> {
    return proxyUpstreamApi(request, "/api/parse")
}

export const GET = proxyParse
export const POST = proxyParse
export const PUT = proxyParse
export const PATCH = proxyParse
export const DELETE = proxyParse
export const OPTIONS = proxyParse
export const HEAD = proxyParse
