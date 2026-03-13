import type { MetadataRoute } from "next";

import { getDictionary } from "@/lib/i18n";
import { i18n } from "@/lib/i18n/config";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const dict = await getDictionary(i18n.defaultLocale);

  return {
    id: "/",
    name: dict.metadata.siteName,
    short_name: "UM Downloader",
    description: dict.unified.pageDescription,
    lang: "zh-CN",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#000000",
    theme_color: "#000000",
    icons: [
      {
        src: "/icons/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icons/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/icons/maskable-icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
