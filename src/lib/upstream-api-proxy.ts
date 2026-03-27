import { NextRequest, NextResponse } from "next/server"

const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:8080"

const FORWARDED_REQUEST_HEADERS = [
    "accept",
    "content-type",
    "range",
] as const

type StreamingRequestInit = RequestInit & {
    duplex?: "half"
}

function buildUpstreamUrl(pathname: string, request: NextRequest): URL {
    const upstream = new URL(pathname, API_BASE_URL)
    upstream.search = request.nextUrl.search
    return upstream
}

function buildUpstreamHeaders(request: NextRequest): Headers {
    const headers = new Headers()

    for (const headerName of FORWARDED_REQUEST_HEADERS) {
        const value = request.headers.get(headerName)
        if (value) {
            headers.set(headerName, value)
        }
    }

    return headers
}

export async function proxyUpstreamApi(
    request: NextRequest,
    pathname: string
): Promise<Response> {
    const method = request.method
    const upstreamInit: StreamingRequestInit = {
        method,
        headers: buildUpstreamHeaders(request),
        body: method === "GET" || method === "HEAD" ? undefined : request.body,
        duplex: method === "GET" || method === "HEAD" ? undefined : "half",
        redirect: "follow",
        cache: "no-store",
    }

    const upstreamResponse = await fetch(buildUpstreamUrl(pathname, request), upstreamInit)

    const responseHeaders = new Headers()
    for (const [key, value] of upstreamResponse.headers) {
        if (key.toLowerCase() === "content-encoding") continue
        if (key.toLowerCase() === "transfer-encoding") continue
        responseHeaders.set(key, value)
    }

    return new NextResponse(upstreamResponse.body, {
        status: upstreamResponse.status,
        statusText: upstreamResponse.statusText,
        headers: responseHeaders,
    })
}
