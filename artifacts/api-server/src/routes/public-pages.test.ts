import express from "express";
import request from "supertest";
import { readFileSync } from "node:fs";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  select: vi.fn(),
  rows: [] as Record<string, unknown>[],
  selections: [] as Record<string, unknown>[],
}));
vi.mock("@workspace/db", () => {
  const columns = new Proxy({}, { get: (_target, name) => name });
  return { db: { select: mocks.select }, runnersTable: columns, usersTable: columns };
});
vi.mock("drizzle-orm", () => ({
  eq: (column: string, value: unknown) => ({ column, value }),
  and: (...conditions: unknown[]) => ({ and: conditions }),
  asc: (column: unknown) => column,
}));

import publicPagesRouter, { loadPublicShell } from "./public-pages";

const shell = readFileSync(new URL("../../../runmatch/index.html", import.meta.url), "utf8");
const app = express();
app.use((req, _res, next) => {
  req.log = { error: vi.fn() } as unknown as typeof req.log;
  next();
});
app.use(publicPagesRouter);

function matches(row: Record<string, unknown>, condition: unknown): boolean {
  const predicate = condition as { column?: string; value?: unknown; and?: unknown[] };
  if (predicate.and) return predicate.and.every((part) => matches(row, part));
  return row[predicate.column!] === predicate.value;
}

const publicRunner = {
  id: 31, name: "Alex Example", city: "Example City", country: "Example Country",
  profileType: "individual", clubName: null, experience: "intermediate", publicListing: true,
  bio: "PRIVATE BIO", travelNote: "PRIVATE TRAVEL", authUserId: "PRIVATE OWNER",
  trackingApps: { stravaUrl: "PRIVATE LINK" },
};
const privateRunner = { ...publicRunner, id: 32, name: "Private Runner", publicListing: false };

beforeEach(() => {
  vi.clearAllMocks();
  mocks.rows = [publicRunner, privateRunner];
  mocks.selections = [];
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, text: async () => shell }));
  mocks.select.mockImplementation((selection: Record<string, unknown>) => {
    mocks.selections.push(selection);
    let condition: unknown;
    let limit = Infinity;
    let offset = 0;
    const query = {
      from: () => query,
      where: (filter: unknown) => { condition = filter; return query; },
      orderBy: () => query,
      limit: (count: number) => { limit = count; return query; },
      offset: (count: number) => { offset = count; return query; },
      then: (resolve: (rows: unknown[]) => unknown) => Promise.resolve(
        mocks.rows.filter((row) => matches(row, condition)).slice(offset, offset + limit)
          .map((row) => Object.fromEntries(Object.entries(selection).map(([key, column]) => [key, row[String(column)]]))),
      ).then(resolve),
    };
    return query;
  });
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("crawl-visible public pages", () => {
  it("returns runner content, unique metadata and structured data without running JavaScript", async () => {
    const response = await request(app).get("/runner/31?ref=share");
    expect(response.status).toBe(200);
    expect(response.text).toContain("<h1>Alex Example — RunBuddy profile</h1>");
    expect(response.text).toContain("intermediate runner in Example City, Example Country");
    expect(response.text).toContain('<link rel="canonical" href="https://RunBuddy.replit.app/runner/31">');
    expect(response.text).toContain('property="og:url" content="https://RunBuddy.replit.app/runner/31"');
    expect(response.text.match(/<title>/g)).toHaveLength(1);
    expect(response.text.match(/rel="canonical"/g)).toHaveLength(1);
    const structured = JSON.parse(response.text.match(/<script type="application\/ld\+json" data-public-seo>([\s\S]*?)<\/script>/)![1]);
    expect(structured["@type"]).toBe("ProfilePage");
    expect(structured.mainEntity.name).toBe("Alex Example");
    expect(response.text).not.toContain("PRIVATE");
    expect(response.text).not.toContain("Find Running Partners Worldwide | RunBuddy");
    expect(response.headers["cache-control"]).toContain("no-store");
    expect(response.headers.etag).toBeUndefined();
    expect(fetch).toHaveBeenCalledWith("http://localhost:80/index.html", expect.not.objectContaining({ headers: expect.anything() }));
  });

  it("does not include opt-out profiles in HTML, links or the sitemap, even with a cookie", async () => {
    const directory = await request(app).get("/run-buddy").set("Cookie", "session=fake");
    expect(directory.status).toBe(200);
    expect(directory.text).toContain('href="/runner/31"');
    expect(directory.text).not.toContain('href="/runner/32"');
    expect(directory.text).not.toContain("Private Runner");
    const sitemap = await request(app).get("/sitemap.xml");
    expect(sitemap.status).toBe(200);
    expect(sitemap.headers["content-type"]).toContain("application/xml");
    expect(sitemap.text).toContain("<loc>https://RunBuddy.replit.app/runner/31</loc>");
    expect(sitemap.text).not.toContain("/runner/32");
    expect(mocks.selections.flatMap(Object.keys)).not.toContain("bio");
  });

  it("removes an opted-out or deleted runner immediately, including conditional requests", async () => {
    expect((await request(app).get("/runner/31")).status).toBe(200);
    mocks.rows[0] = { ...publicRunner, publicListing: false };
    const response = await request(app).get("/runner/31").set("If-None-Match", "*");
    expect(response.status).toBe(404);
    expect(response.headers["x-robots-tag"]).toBe("noindex, nofollow");
    expect(response.text).toContain('name="robots" content="noindex, nofollow"');
    expect(response.text).not.toContain("Alex Example");
    expect((await request(app).get("/sitemap.xml")).text).not.toContain("/runner/31");
    mocks.rows = [];
    expect((await request(app).get("/run-buddy")).text).not.toContain("/runner/31");
    expect((await request(app).get("/runner/31")).status).toBe(404);
  });

  it.each(["32", "999", "0", "-1", "abc", "1e2", "2147483648"])("returns a noindex 404 for private, missing or invalid ID %s", async (id) => {
    const response = await request(app).get(`/runner/${id}`);
    expect(response.status).toBe(404);
    expect(response.text).toContain("Runner profile unavailable");
    expect(response.text).not.toContain("Private Runner");
    expect(response.text).not.toContain('"@type":"ProfilePage"');
  });

  it("escapes user-controlled HTML, attributes and structured-data script endings", async () => {
    mocks.rows = [{ ...publicRunner, name: 'Name $& "</script><script>alert(1)</script>' }];
    const response = await request(app).get("/runner/31");
    expect(response.text).toContain("Name $&amp; &quot;&lt;/script&gt;");
    expect(response.text).not.toContain("<script>alert(1)</script>");
    expect(response.text).toContain("\\u003c/script>");
  });

  it("links through all public directory pages with page-specific canonicals", async () => {
    mocks.rows = Array.from({ length: 101 }, (_, index) => ({ ...publicRunner, id: index + 1 }));
    const first = await request(app).get("/run-buddy/");
    expect(first.text).toContain('href="/run-buddy?page=2"');
    expect(first.text).not.toContain('href="/runner/101"');
    const second = await request(app).get("/run-buddy?page=2");
    expect(second.text).toContain('href="/runner/101"');
    expect(second.text).toContain('href="https://RunBuddy.replit.app/run-buddy?page=2"');
    expect(second.text).toContain("Page 2 | RunBuddy");
    expect(second.text).toContain('href="/run-buddy">Previous runners');
    expect((await request(app).get("/run-buddy?page=3")).status).toBe(404);
    expect((await request(app).get("/run-buddy?page=bad")).status).toBe(404);
  });

  it("returns an explicit retryable 503 on template or database failure", async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error("Template offline"));
    const response = await request(app).get("/runner/31");
    expect(response.status).toBe(503);
    expect(response.headers["retry-after"]).toBe("60");
    expect(response.headers["x-robots-tag"]).toBe("noindex");
    mocks.select.mockImplementationOnce(() => { throw new Error("Database offline"); });
    expect((await request(app).get("/sitemap.xml")).status).toBe(503);
  });

  it("does not fetch a production shell over the network", async () => {
    vi.stubEnv("NODE_ENV", "production");
    // The production build copies the file beside the compiled API executable.
    await expect(loadPublicShell()).rejects.toThrow("ENOENT");
    expect(fetch).not.toHaveBeenCalled();
  });
});
