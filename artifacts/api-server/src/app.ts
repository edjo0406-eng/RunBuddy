import express, { type Express } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { authMiddleware } from "./middlewares/authMiddleware";
import { createRateLimiter } from "./middlewares/rateLimit";

const app: Express = express();

// Replit terminates requests at a trusted reverse proxy. Trust only that
// nearest proxy hop so req.ip identifies the caller for public rate limits.
app.set("trust proxy", 1);

const allowedCorsOrigins = new Set(
  (process.env.CORS_ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
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
app.use(
  "/api",
  createRateLimiter({
    windowMs: 15 * 60 * 1000,
    max: 300,
  }),
);
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(authMiddleware);

app.use("/api", router);

export default app;
