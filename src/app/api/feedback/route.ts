import { NextRequest } from "next/server"

import { proxyUpstreamApi } from "@/lib/upstream-api-proxy"

export function POST(request: NextRequest): Promise<Response> {
    return proxyUpstreamApi(request, "/api/feedback")
}
