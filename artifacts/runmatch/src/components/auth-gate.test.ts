import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const authState = vi.hoisted(() => ({
  isLoaded: false,
  isSignedIn: false,
}));

vi.mock("@clerk/react", () => ({
  useAuth: () => authState,
}));

vi.mock("@/lib/analytics", () => ({
  trackEvent: vi.fn(),
}));

import { AuthGate } from "./auth-gate";

function renderGate() {
  return renderToStaticMarkup(
    createElement(
      AuthGate,
      { basePath: "/runmatch" },
      createElement("p", null, "Private content"),
    ),
  );
}

describe("authentication gate", () => {
  beforeEach(() => {
    authState.isLoaded = false;
    authState.isSignedIn = false;
  });

  it("waits while the Clerk session is still loading", () => {
    const markup = renderGate();

    expect(markup).not.toContain("Sign in to RunBuddy");
    expect(markup).not.toContain("Private content");
  });

  it("shows the signed-out state after auth has loaded, with artifact-prefixed links", () => {
    authState.isLoaded = true;

    const markup = renderGate();

    expect(markup).toContain('href="/runmatch/sign-in"');
    expect(markup).toContain('href="/runmatch/sign-up"');
    expect(markup).not.toContain("Private content");
  });

  it("shows protected content for a loaded signed-in session", () => {
    authState.isLoaded = true;
    authState.isSignedIn = true;

    expect(renderGate()).toContain("Private content");
  });
});