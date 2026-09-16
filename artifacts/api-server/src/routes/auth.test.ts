import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const authMocks = vi.hoisted(() => ({
  clearSession: vi.fn(),
  createSession: vi.fn(),
  deleteSession: vi.fn(),
  getOidcConfig: vi.fn().mockResolvedValue({}),
  getSession: vi.fn(),
  getSessionId: vi.fn(
    (req: { cookies?: Record<string, string> }) => req.cookies?.sid,
  ),
  updateSession: vi.fn(),
}));

const oidcMocks = vi.hoisted(() => ({
  authorizationCodeGrant: vi.fn(),
}));

vi.mock("../lib/auth", () => ({
  ...authMocks,
  ISSUER_URL: "https://replit.com/oidc",
  SESSION_COOKIE: "sid",
  SESSION_TTL: 60_000,
}));

vi.mock("@workspace/db", () => ({
  db: {},
  usersTable: new Proxy(
    {},
    { get: (_target, property) => property },
  ),
  sessionsTable: new Proxy(
    {},
    { get: (_target, property) => property },
  ),
  runnersTable: new Proxy(
    {},
    { get: (_target, property) => property },
  ),
  connectionsTable: new Proxy(
    {},
    { get: (_target, property) => property },
  ),
  messagesTable: new Proxy(
    {},
    { get: (_target, property) => property },
  ),
}));

vi.mock("openid-client", () => ({
  ...oidcMocks,
  buildAuthorizationUrl: vi.fn(),
  buildEndSessionUrl: vi.fn(),
  calculatePKCECodeChallenge: vi.fn(),
  randomNonce: vi.fn(),
  randomPKCECodeVerifier: vi.fn(),
  randomState: vi.fn(),
  refreshTokenGrant: vi.fn(),
}));

import app from "../app";

describe("web authentication regressions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMocks.getOidcConfig.mockResolvedValue({});
  });

  it("returns callback failures to the app without restarting login", async () => {
    const response = await request(app).get("/api/callback");

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe("/?authError=missing_oidc_cookies");
    expect(response.headers.location).not.toContain("/api/login");
  });

  it("returns token exchange failures to the app without restarting login", async () => {
    oidcMocks.authorizationCodeGrant.mockRejectedValueOnce(
      new Error("provider rejected the callback"),
    );

    const response = await request(app)
      .get("/api/callback?code=failed-code&state=expected-state")
      .set(
        "Cookie",
        "code_verifier=verifier; nonce=nonce; state=expected-state; return_to=/run-buddy",
      );

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe("/?authError=token_exchange_failed");
    expect(response.headers.location).not.toContain("/api/login");
  });

  it("never caches or returns 304 for the current auth state", async () => {
    const initial = await request(app).get("/api/auth/user");
    expect(initial.status).toBe(200);
    expect(initial.headers["cache-control"]).toBe(
      "no-store, no-cache, must-revalidate",
    );
    expect(initial.body).toEqual({ user: null });

    const conditional = await request(app)
      .get("/api/auth/user")
      .set("If-None-Match", initial.headers.etag ?? '"cached-auth-state"');

    expect(conditional.status).toBe(200);
    expect(conditional.body).toEqual({ user: null });
  });

  it("returns an authenticated user for a valid session cookie", async () => {
    const user = {
      id: "user-1",
      email: "runner@example.com",
      firstName: "Test",
      lastName: "Runner",
      profileImageUrl: null,
    };
    authMocks.getSession.mockResolvedValue({
      user,
      access_token: "access-token",
      expires_at: Math.floor(Date.now() / 1000) + 60,
    });

    const response = await request(app)
      .get("/api/auth/user")
      .set("Cookie", "sid=valid-session");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ user });
    expect(authMocks.getSession).toHaveBeenCalledWith("valid-session");
  });
});