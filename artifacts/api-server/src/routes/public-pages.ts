import { Router, type IRouter } from "express";
import { readFile } from "node:fs/promises";
import { db, runnersTable } from "@workspace/db";
import { and, asc, eq } from "drizzle-orm";
import { discoverableRunnerSelection } from "../lib/authorization";
import {
  DIRECTORY_PAGE_SIZE,
  directoryPage,
  profilePage,
  renderPublicPage,
  renderSitemap,
  unavailablePage,
} from "../lib/publicSeo";

const router: IRouter = Router();

export async function loadPublicShell(): Promise<string> {
  if (process.env.NODE_ENV === "production") {
    // Bundled next to the API executable; contains assets, never runner data.
    return readFile(new URL("./public-shell.html", import.meta.url), "utf8");
  }
  // Use the shared proxy for Vite's transformed development shell. Never
  // forward cookies: crawl-visible HTML always uses the anonymous allowlist.
  const response = await fetch("http://localhost:80/index.html", {
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) throw new Error("Public web shell unavailable");
  return response.text();
}

router.use(["/runner", "/run-buddy", "/sitemap.xml"], (_req, res, next) => {
  // Do not retain snapshots after an opt-out or deletion, including 304s.
  res.set("Cache-Control", "no-store, no-cache, must-revalidate");
  next();
});

router.get("/runner/:id", async (req, res) => {
  const rawId = String(req.params.id);
  const id = Number(rawId);
  const valid = /^[1-9]\d*$/.test(rawId) && Number.isSafeInteger(id) && id <= 2147483647;
  const [runner] = valid
    ? await db.select(discoverableRunnerSelection).from(runnersTable)
      .where(and(eq(runnersTable.id, id), eq(runnersTable.publicListing, true))).limit(1)
    : [];
  const page = runner ? profilePage(runner) : unavailablePage(`/runner/${encodeURIComponent(rawId)}`);
  if (!runner) res.set("X-Robots-Tag", "noindex, nofollow");
  // end() deliberately avoids Express conditional-GET conversion to 304.
  res.status(runner ? 200 : 404).type("html").end(renderPublicPage(await loadPublicShell(), page));
});

router.get("/run-buddy", async (req, res) => {
  const page = req.query.page === undefined ? 1 : Number(req.query.page);
  if (!Number.isSafeInteger(page) || page < 1 || page > 100000) {
    res.set("X-Robots-Tag", "noindex");
    res.status(404).type("html").end(renderPublicPage(await loadPublicShell(), unavailablePage("/run-buddy")));
    return;
  }
  const results = await db.select(discoverableRunnerSelection).from(runnersTable)
    .where(eq(runnersTable.publicListing, true)).orderBy(asc(runnersTable.id))
    .limit(DIRECTORY_PAGE_SIZE + 1).offset((page - 1) * DIRECTORY_PAGE_SIZE);
  const emptyPage = page > 1 && results.length === 0;
  if (emptyPage) res.set("X-Robots-Tag", "noindex");
  res.status(emptyPage ? 404 : 200).type("html").end(renderPublicPage(
    await loadPublicShell(),
    { ...directoryPage(results.slice(0, DIRECTORY_PAGE_SIZE), page, results.length > DIRECTORY_PAGE_SIZE), noindex: emptyPage },
  ));
});

router.get("/sitemap.xml", async (_req, res) => {
  const runners = await db.select({ id: runnersTable.id }).from(runnersTable)
    .where(eq(runnersTable.publicListing, true)).orderBy(asc(runnersTable.id));
  res.type("application/xml").end(renderSitemap(runners.map((runner) => runner.id)));
});

// A template/database failure must not masquerade as homepage HTML or 404.
router.use(((error, req, res, _next) => {
  req.log.error({ err: error }, "Public page rendering failed");
  res.set("X-Robots-Tag", "noindex");
  res.set("Retry-After", "60");
  res.status(503).type("text").end("Public page temporarily unavailable. Please try again.");
}) satisfies import("express").ErrorRequestHandler);

export default router;
