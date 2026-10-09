import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { readFileSync } from "node:fs";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
import { VitePWA } from "vite-plugin-pwa";
import {
  getCanonicalUrl,
  getPublicPageMetadata,
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

const testHttpsKeyPath = process.env.RUNMATCH_TEST_HTTPS_KEY;
const testHttpsCertPath = process.env.RUNMATCH_TEST_HTTPS_CERT;

if (Boolean(testHttpsKeyPath) !== Boolean(testHttpsCertPath)) {
  throw new Error(
    "RUNMATCH_TEST_HTTPS_KEY and RUNMATCH_TEST_HTTPS_CERT must be provided together.",
  );
}

const testHttps =
  testHttpsKeyPath && testHttpsCertPath
    ? {
        key: readFileSync(testHttpsKeyPath),
        cert: readFileSync(testHttpsCertPath),
      }
    : undefined;

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
        <p>Search the running community by city, country, and experience. Meet a compatible running partner for a morning loop, travel run, or regular training.</p>
        <section aria-labelledby="directory-intro">
          <h2 id="directory-intro">Browse runners who choose to be listed</h2>
          <p>The public directory shows only runners who have chosen to appear in discovery. Search by city or country and compare experience levels to find a running partner for a local route or regular training. Profiles that have not opted in are not shown to visitors.</p>
          <p>Runner descriptions, travel plans, contact details and messages are not included in the public directory. Sign in to connect with a runner.</p>
        </section>
        <p><a href="/">Learn how RunBuddy connects runners worldwide</a></p>
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
        : PUBLIC_PAGE_CONTENT.home;
    return metadata ? applyPublicPage(html, metadata, content) : html;
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
        navigateFallbackDenylist: [/^\/api\//, /^\/runner(?:\/|$)/, /^\/run-buddy(?:\/|$)/, /^\/sitemap\.xml$/],
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
    ...(testHttps ? { https: testHttps } : {}),
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
