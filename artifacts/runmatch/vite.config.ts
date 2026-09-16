import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
import { VitePWA } from "vite-plugin-pwa";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import {
  getCanonicalUrl,
  getPublicPageMetadata,
  PUBLIC_PAGE_METADATA,
  SITE_NAME,
  SOCIAL_IMAGE_URL,
  type PageMetadata,
} from "./src/lib/seo";

const rawPort = process.env.PORT;

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const basePath = process.env.BASE_PATH;

if (!basePath) {
  throw new Error(
    "BASE_PATH environment variable is required but was not provided.",
  );
}

const outputDirectory = path.resolve(import.meta.dirname, "dist/public");

function replaceAttributeContent(
  html: string,
  selectorPattern: string,
  attribute: "content" | "href",
  value: string,
) {
  const tagPattern = new RegExp(
    `(<(?:meta|link)\\s+[^>]*${selectorPattern}[^>]*${attribute}=")[^"]*(")`,
  );
  return html.replace(tagPattern, `$1${value}$2`);
}

function applyMetadata(html: string, metadata: PageMetadata) {
  const canonicalUrl = getCanonicalUrl(metadata);
  let output = html.replace(/<title>[^<]*<\/title>/, `<title>${metadata.title}</title>`);

  output = replaceAttributeContent(output, 'name="description"', "content", metadata.description);
  output = replaceAttributeContent(output, 'rel="canonical"', "href", canonicalUrl);
  output = replaceAttributeContent(output, 'property="og:title"', "content", metadata.title);
  output = replaceAttributeContent(output, 'property="og:description"', "content", metadata.description);
  output = replaceAttributeContent(output, 'property="og:url"', "content", canonicalUrl);
  output = replaceAttributeContent(output, 'property="og:type"', "content", "website");
  output = replaceAttributeContent(output, 'property="og:site_name"', "content", SITE_NAME);
  output = replaceAttributeContent(output, 'property="og:image"', "content", SOCIAL_IMAGE_URL);
  output = replaceAttributeContent(output, 'name="twitter:card"', "content", "summary_large_image");
  output = replaceAttributeContent(output, 'name="twitter:title"', "content", metadata.title);
  output = replaceAttributeContent(output, 'name="twitter:description"', "content", metadata.description);
  output = replaceAttributeContent(output, 'name="twitter:image"', "content", SOCIAL_IMAGE_URL);

  return output;
}

const routeMetadataPlugin = {
  name: "runbuddy-route-metadata",
  transformIndexHtml(html: string, context?: { path?: string }) {
    const metadata = getPublicPageMetadata(context?.path?.split(/[?#]/)[0] ?? "/");
    return metadata ? applyMetadata(html, metadata) : html;
  },
  async closeBundle() {
    const homeHtml = await readFile(path.join(outputDirectory, "index.html"), "utf8");
    const runBuddyDirectory = path.join(outputDirectory, "run-buddy");
    await mkdir(runBuddyDirectory, { recursive: true });
    await writeFile(
      path.join(runBuddyDirectory, "index.html"),
      applyMetadata(homeHtml, PUBLIC_PAGE_METADATA.runBuddy),
    );
  },
};

export default defineConfig({
  base: basePath,
  plugins: [
    react(),
    routeMetadataPlugin,
    tailwindcss(),
    runtimeErrorOverlay(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg", "icon-192.svg", "icon-512.svg"],
      workbox: {
        navigateFallbackDenylist: [/^\/api\//],
      },
      manifest: {
        name: "RunBuddy",
        short_name: "RunBuddy",
        description: "Find your pace and your running community with RunBuddy.",
        theme_color: "#FF3C00",
        background_color: "#ffffff",
        display: "standalone",
        orientation: "portrait",
        start_url: "/",
        scope: "/",
        icons: [
          {
            src: "/icon-192.svg",
            sizes: "192x192",
            type: "image/svg+xml",
            purpose: "any",
          },
          {
            src: "/icon-512.svg",
            sizes: "512x512",
            type: "image/svg+xml",
            purpose: "any maskable",
          },
        ],
      },
      devOptions: {
        enabled: false,
      },
    }),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer({
              root: path.resolve(import.meta.dirname, ".."),
            }),
          ),
          await import("@replit/vite-plugin-dev-banner").then((m) =>
            m.devBanner(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "@assets": path.resolve(import.meta.dirname, "..", "..", "attached_assets"),
    },
    dedupe: ["react", "react-dom"],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: outputDirectory,
    emptyOutDir: true,
  },
  server: {
    port,
    strictPort: true,
    host: "0.0.0.0",
    allowedHosts: true,
    fs: {
      strict: true,
    },
  },
  preview: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
  },
});
