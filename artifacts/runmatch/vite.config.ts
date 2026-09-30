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

const PUBLIC_PAGE_CONTENT = {
  home: `
      <header>
        <nav aria-label="Primary navigation">
          <a href="/">RunBuddy home</a>
          <a href="/run-buddy">Find a RunBuddy</a>
        </nav>
      </header>
      <main>
        <h1>Find running partners worldwide with RunBuddy</h1>
        <p>Meet runners who share your pace, city, and goals. Find local running partners, plan shared routes, and join a worldwide running community.</p>
        <p><a href="/run-buddy">Search for a running companion by city, pace, and experience</a></p>
      </main>
      <footer><a href="/">RunBuddy</a></footer>`,
  runBuddy: `
      <header>
        <nav aria-label="Primary navigation">
          <a href="/">RunBuddy home</a>
          <a href="/run-buddy">Find a RunBuddy</a>
        </nav>
      </header>
      <main>
        <h1>Find a RunBuddy near you</h1>
        <p>Search the running community by city, country, pace, and experience. Meet a compatible running partner for a morning loop, travel run, or regular training.</p>
        <p><a href="/">Learn how RunBuddy connects runners worldwide</a></p>
      </main>
      <footer><a href="/">RunBuddy</a></footer>`,
  runDate: `
      <header>
        <nav aria-label="Primary navigation">
          <a href="/">RunBuddy home</a>
          <a href="/run-buddy">Find a RunBuddy</a>
        </nav>
      </header>
      <main>
        <h1>RunDate is now part of RunBuddy</h1>
        <p>Discover runners by city, pace, and experience for local routes, travel runs, and shared training in one worldwide running community.</p>
        <p><a href="/run-buddy">Find a running companion with RunBuddy</a></p>
      </main>
      <footer><a href="/">RunBuddy</a></footer>`,
} as const;

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

function applyPublicPage(
  html: string,
  metadata: PageMetadata,
  content: string,
) {
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
  output = output.replace(
    /(<!-- static-public-content:start -->)[\s\S]*?(<!-- static-public-content:end -->)/,
    `$1${content}\n      $2`,
  );

  return output;
}

const routeMetadataPlugin = {
  name: "runbuddy-route-metadata",
  transformIndexHtml(html: string, context?: { path?: string }) {
    const pathname = context?.path?.split(/[?#]/)[0] ?? "/";
    const metadata = getPublicPageMetadata(pathname);
    const content =
      pathname.replace(/\/+$/, "") === "/run-buddy"
        ? PUBLIC_PAGE_CONTENT.runBuddy
        : pathname.replace(/\/+$/, "") === "/run-date"
          ? PUBLIC_PAGE_CONTENT.runDate
          : PUBLIC_PAGE_CONTENT.home;
    return metadata ? applyPublicPage(html, metadata, content) : html;
  },
  async closeBundle() {
    const homeHtml = await readFile(path.join(outputDirectory, "index.html"), "utf8");
    const pages = [
      ["run-buddy", PUBLIC_PAGE_METADATA.runBuddy, PUBLIC_PAGE_CONTENT.runBuddy],
      ["run-date", PUBLIC_PAGE_METADATA.runDate, PUBLIC_PAGE_CONTENT.runDate],
    ] as const;

    await Promise.all(
      pages.map(async ([route, metadata, content]) => {
        const directory = path.join(outputDirectory, route);
        await mkdir(directory, { recursive: true });
        await writeFile(
          path.join(directory, "index.html"),
          applyPublicPage(homeHtml, metadata, content),
        );
      }),
    );
  },
};

export default defineConfig({
  base: basePath,
  plugins: [
    react(),
    routeMetadataPlugin,
    tailwindcss({ optimize: false }),
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
