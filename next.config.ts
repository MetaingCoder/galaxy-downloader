import type { NextConfig } from "next";
import { i18n } from "./src/lib/i18n/config";
import withSerwistInit from "@serwist/next";

const withSerwist = withSerwistInit({
    swSrc: "src/sw.ts",
    swDest: "public/sw.js",
    disable: process.env.NODE_ENV === "development",
});

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:8080';

const nextConfig: NextConfig = {
    cacheComponents: true,
    reactCompiler: true,
    experimental: {
        optimizePackageImports: [
            'lucide-react',
            'sonner',
            '@radix-ui/react-collapsible',
            '@radix-ui/react-dialog',
            '@radix-ui/react-label',
            '@radix-ui/react-progress',
            '@radix-ui/react-scroll-area',
            '@radix-ui/react-select',
            '@radix-ui/react-slot',
            '@radix-ui/react-toast',
            '@radix-ui/react-tooltip',
        ],
    },
    async rewrites() {
        const i18nLocales = i18n.locales.join('|');
        return [
            {
                // This will match paths like /zh/v1/..., /en/v1/...
                // It will not match /v1/... directly, which is correct
                // because the middleware ensures a locale is always present.
                source: `/:locale(${i18nLocales})/v1/:path*`,
                destination: `${API_BASE_URL}/api/:path*`,
            },
        ]
    },
};

export default withSerwist(nextConfig);
