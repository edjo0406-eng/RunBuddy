import express, { type Express } from "express";
import cors from "cors";
import { clerkMiddleware } from "@clerk/express";
import { publishableKeyFromHost } from "@clerk/shared/keys";
import pinoHttp from "pino-http";
import router from "./routes";
import publicPagesRouter from "./routes/public-pages";
import { SITE_URL as canonicalSiteUrl } from "./lib/publicSeo";
import { logger } from "./lib/logger";
import { createRateLimiter } from "./middlewares/rateLimit";
import {
  CLERK_PROXY_PATH,
  clerkProxyMiddleware,
  getClerkProxyHost,
} from "./middlewares/clerkProxyMiddleware";

const app: Express = express();

// Replit terminates requests at a trusted reverse proxy. Trust only that
// nearest proxy hop so req.ip identifies the caller for public rate limits.
app.set("trust proxy", 1);

function normalizeOrigin(value: string | undefined): string | undefined {
  if (!value) return undefined;

  try {
    const url = /^https?:\/\//i.test(value) ? value : `https://${value}`;
    return new URL(url).origin;
  } catch {
    return undefined;
  }
}

const allowedCorsOrigins = new Set(
  [
    ...(process.env.CORS_ALLOWED_ORIGINS ?? "")
      .split(",")
      .map((origin) => normalizeOrigin(origin.trim())),
    normalizeOrigin(process.env.REPLIT_EXPO_DEV_DOMAIN),
  ].filter((origin): origin is string => Boolean(origin)),
);

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

app.use(CLERK_PROXY_PATH, clerkProxyMiddleware());

app.use(
  cors({
    credentials: true,
    origin(origin, callback) {
      // Requests without an Origin header (including same-origin requests)
      // do not need CORS headers. Cross-origin access must be explicitly
      // configured rather than reflecting arbitrary caller origins.
      callback(null, !origin || allowedCorsOrigins.has(origin));
    },
  }),
);

app.get("/robots.txt", (_req, res) => {
  res
    .type("text/plain")
    .send(`User-agent: *\nAllow: /\n\nSitemap: ${canonicalSiteUrl}/sitemap.xml\n`);
});

app.use(publicPagesRouter);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  clerkMiddleware((req) => ({
    publishableKey: publishableKeyFromHost(
      getClerkProxyHost(req) ?? "",
      process.env.CLERK_PUBLISHABLE_KEY,
    ),
  })),
);
app.use(
  "/api",
  createRateLimiter({
    windowMs: 15 * 60 * 1000,
    max: 300,
  }),
);

app.use("/api", router);

export default app;
