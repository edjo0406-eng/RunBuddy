import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getAuth: vi.fn(),
  select: vi.fn(),
  update: vi.fn(),
  rows: [] as Record<string, unknown>[],
  selections: [] as Record<string, unknown>[],
  filters: [] as unknown[],
}));

vi.mock("@clerk/express", () => ({
  getAuth: mocks.getAuth,
  clerkClient: { users: { deleteUser: vi.fn() } },
}));
vi.mock("@workspace/db", () => {
  const columns = new Proxy({}, { get: (_target, name) => name });
  return {
    db: { select: mocks.select, update: mocks.update },
    runnersTable: columns,
    connectionsTable: columns,
    usersTable: columns,
  };
});
vi.mock("drizzle-orm", () => ({
  eq: (column: unknown, value: unknown) => ({ column, value }),
  and: (...conditions: unknown[]) => ({ and: conditions }),
  or: (...conditions: unknown[]) => ({ or: conditions }),
  desc: (column: unknown) => column,
  sql: Object.assign((_parts: TemplateStringsArray, column: string, value: string) => ({ column, value, caseInsensitive: true }), { raw: () => null }),
}));

import runnersRouter from "./runners";
import statsRouter from "./stats";

const app = express();
app.use(express.json());
app.use("/api", runnersRouter, statsRouter);

function matches(row: Record<string, unknown>, condition: unknown): boolean {
  if (!condition) return true;
  const predicate = condition as {
    column?: string;
    value?: unknown;
    caseInsensitive?: boolean;
    and?: unknown[];
    or?: unknown[];
  };
  if (predicate.and) return predicate.and.every((part) => matches(row, part));
  if (predicate.or) return predicate.or.some((part) => matches(row, part));
  if (predicate.caseInsensitive) {
    return String(row[predicate.column!] ?? "").toLowerCase() === String(predicate.value).toLowerCase();
  }
  return row[predicate.column!] === predicate.value;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.rows = [];
  mocks.selections = [];
  mocks.filters = [];
  mocks.getAuth.mockReturnValue({ userId: null });
  mocks.select.mockImplementation((selection?: Record<string, unknown>) => {
    if (selection) mocks.selections.push(selection);
    let filter: unknown;
    const result = () =>
      mocks.rows
        .filter((row) => matches(row, filter))
        .map((row) =>
          selection
            ? Object.fromEntries(
                Object.entries(selection).map(([field, column]) => [
                  field,
                  row[String(column)],
                ]),
              )
            : row,
        );
    const query = {
      from: () => query,
      where: (condition: unknown) => {
        filter = condition;
        mocks.filters.push(condition);
        return query;
      },
      orderBy: () => query,
      limit: async () => result(),
      then: (resolve: (rows: unknown[]) => unknown) => Promise.resolve(result()).then(resolve),
    };
    return query;
  });
  mocks.update.mockImplementation(() => {
    let values: Record<string, unknown> = {};
    let filter: unknown;
    const query = {
      set: (nextValues: Record<string, unknown>) => {
        values = nextValues;
        return query;
      },
      where: (condition: unknown) => {
        filter = condition;
        return query;
      },
      returning: async () => {
        const row = mocks.rows.find((candidate) => matches(candidate, filter));
        if (!row) return [];
        Object.assign(row, values);
        return [row];
      },
    };
    return query;
  });
});

describe("anonymous runner discovery", () => {
  it("filters the directory to opted-in profiles and selects only safe fields", async () => {
    const response = await request(app).get("/api/runners?mode=buddy");
    expect(response.status).toBe(200);
    expect(JSON.stringify(mocks.filters)).toContain('"column":"publicListing","value":true');
    expect(mocks.selections[0]).toHaveProperty("name");
    expect(Object.keys(mocks.selections[0]).sort()).toEqual([
      "city",
      "clubName",
      "country",
      "createdAt",
      "experience",
      "id",
      "lookingFor",
      "name",
      "profileType",
      "updatedAt",
    ]);
    for (const privateField of [
      "bio",
      "travelNote",
      "trackingApps",
      "authUserId",
      "lat",
      "lng",
      "age",
      "avatarUrl",
      "runningStats",
      "travelCity",
      "travelCountry",
      "travelUntil",
    ]) {
      expect(mocks.selections[0]).not.toHaveProperty(privateField);
    }
  });

  it("filters anonymous results by consent and the requested running mode", async () => {
    const makeRunner = (
      id: number,
      publicListing: boolean,
      lookingFor: string,
    ) => ({
      id,
      name: `Runner ${id}`,
      publicListing,
      lookingFor,
      city: "Bristol",
      country: "United Kingdom",
      profileType: "individual",
      clubName: null,
      experience: "intermediate",
      createdAt: "2026-10-03T10:00:00.000Z",
      updatedAt: "2026-10-03T10:00:00.000Z",
      age: 32,
      bio: "Private bio",
      avatarUrl: "https://example.com/private-photo.jpg",
      trackingApps: { stravaUrl: "https://example.com/runner" },
      runningStats: { weeklyDistanceKm: 40 },
      lat: 51.45,
      lng: -2.59,
      travelCity: "Tokyo",
      travelCountry: "Japan",
      travelUntil: "2026-10-10",
      travelNote: "Private travel note",
    });
    mocks.rows = [
      makeRunner(1, false, "buddy"),
      makeRunner(2, true, "buddy"),
      makeRunner(3, true, "date"),
      makeRunner(4, true, "both"),
    ];

    const buddyResponse = await request(app).get("/api/runners?mode=buddy");
    expect(
      buddyResponse.body.map((runner: { id: number }) => runner.id),
    ).toEqual([2, 4]);
    expect(Object.keys(buddyResponse.body[0]).sort()).toEqual([
      "city",
      "clubName",
      "country",
      "createdAt",
      "experience",
      "id",
      "lookingFor",
      "name",
      "profileType",
      "updatedAt",
    ]);

    const dateResponse = await request(app).get("/api/runners?mode=date");
    expect(
      dateResponse.body.map((runner: { id: number }) => runner.id),
    ).toEqual([3, 4]);
  });

  it("persists profile visibility updates before anonymous discovery reads", async () => {
    const userId = "runner-user";
    mocks.rows = [
      { id: userId },
      {
        id: 12,
        authUserId: userId,
        name: "Runner",
        publicListing: false,
        lookingFor: "buddy",
        city: "Bristol",
        country: "United Kingdom",
        profileType: "individual",
        clubName: null,
        experience: "intermediate",
        createdAt: "2026-10-03T10:00:00.000Z",
        updatedAt: "2026-10-03T10:00:00.000Z",
      },
    ];
    mocks.getAuth.mockReturnValue({ userId });

    const optIn = await request(app)
      .put("/api/runners/12")
      .send({ publicListing: true });
    expect(optIn.status).toBe(200);
    expect(mocks.rows.find((row) => row.id === 12)?.publicListing).toBe(true);

    mocks.getAuth.mockReturnValue({ userId: null });
    const discoverable = await request(app).get("/api/runners?mode=buddy");
    expect(discoverable.body.map((runner: { id: number }) => runner.id)).toEqual([
      12,
    ]);

    mocks.getAuth.mockReturnValue({ userId });
    const optOut = await request(app)
      .put("/api/runners/12")
      .send({ publicListing: false });
    expect(optOut.status).toBe(200);
    expect(mocks.rows.find((row) => row.id === 12)?.publicListing).toBe(false);

    mocks.getAuth.mockReturnValue({ userId: null });
    const noLongerDiscoverable = await request(app).get(
      "/api/runners?mode=buddy",
    );
    expect(noLongerDiscoverable.body).toEqual([]);
  });

  it("filters featured runners to opted-in profiles", async () => {
    const response = await request(app).get("/api/stats/featured");
    expect(response.status).toBe(200);
    expect(mocks.filters).toContainEqual({ column: "publicListing", value: true });
    expect(mocks.selections[0]).not.toHaveProperty("bio");
  });

  it("does not reveal travel destinations through anonymous city or country searches", async () => {
    mocks.rows = [{
      id: 12,
      name: "Runner",
      publicListing: true,
      city: "Berlin",
      country: "Germany",
      travelCity: "Tokyo",
      travelCountry: "Japan",
      bio: "Private biography",
      travelNote: "Private itinerary",
    }];
    expect((await request(app).get("/api/runners?city=Tokyo")).body).toEqual([]);
    expect((await request(app).get("/api/runners?country=Japan")).body).toEqual([]);
    const publicResponse = await request(app).get("/api/runners?city=Berlin&country=Germany");
    expect(publicResponse.body).toHaveLength(1);
    expect(publicResponse.body[0]).toMatchObject({ name: "Runner", city: "Berlin" });
    expect(publicResponse.body[0]).not.toHaveProperty("bio");
    expect(publicResponse.body[0]).not.toHaveProperty("travelNote");
    expect(publicResponse.body[0]).not.toHaveProperty("travelCity");

    mocks.getAuth.mockReturnValue({ userId: "signed-in" });
    expect((await request(app).get("/api/runners?city=Tokyo&country=Japan")).body).toHaveLength(1);
  });

  it("hides a non-opted-in profile behind a 404", async () => {
    const response = await request(app).get("/api/runners/12");
    expect(response.status).toBe(404);
    expect(JSON.stringify(mocks.filters)).toContain('"column":"publicListing","value":true');
  });

  it("does not expose running app links on anonymous profile details", async () => {
    mocks.rows = [{
      id: 12,
      name: "Runner",
      publicListing: true,
      trackingApps: { stravaUrl: "https://strava.example/runner" },
    }];

    const response = await request(app).get("/api/runners/12");

    expect(response.status).toBe(200);
    expect(response.body).not.toHaveProperty("trackingApps");
    expect(mocks.selections[0]).not.toHaveProperty("trackingApps");
  });

  it("preserves the authenticated profile view", async () => {
    mocks.getAuth.mockReturnValue({ userId: "signed-in" });
    const response = await request(app).get("/api/runners");
    expect(response.status).toBe(200);
    expect(mocks.selections.some((selection) => "bio" in selection)).toBe(true);
    expect(mocks.filters.at(-1)).toBeUndefined();
  });

  it("includes linked running accounts in signed-in profile details", async () => {
    const trackingApps = { stravaUrl: "https://strava.example/runner" };
    mocks.getAuth.mockReturnValue({ userId: "signed-in" });
    mocks.rows = [{ id: 14, name: "Runner", trackingApps }];

    const response = await request(app).get("/api/runners/14");

    expect(response.status).toBe(200);
    expect(response.body.trackingApps).toEqual(trackingApps);
    expect(mocks.selections.some((selection) => "trackingApps" in selection)).toBe(true);
  });
});