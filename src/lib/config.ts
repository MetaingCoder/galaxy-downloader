/**
 * API Configuration
 */

/**
 * API Endpoints
 * These paths are relative to the app itself and are proxied by a route handler.
 */
export const API_ENDPOINTS = {
    // 统一接口
    unified: {
        parse: '/api/parse',
        download: '/api/download',
    },
} as const;
