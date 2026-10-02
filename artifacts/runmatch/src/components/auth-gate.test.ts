import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const authState = vi.hoisted(() => ({
  isLoaded: false,
  isSignedIn: null as boolean | null,
  options: null as { treatPendingAsSignedOut?: boolean } | null,
}));

vi.mock("@clerk/react", () => ({
  useAuth: (options: { treatPendingAsSignedOut?: boolean } | undefined) => {
    authState.options = options ?? null;
    return authState;
  },
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
    authState.isSignedIn = null;
    authState.options = null;
  });

  it("keeps private content protected and offers retry/public navigation while auth is pending", () => {
    const markup = renderGate();

    expect(markup).toContain("Checking your RunBuddy session");
    expect(markup).toContain('data-testid="button-retry-session-check"');
    expect(markup).toContain('href="/runmatch/run-buddy"');
    expect(markup).not.toContain("Sign in to RunBuddy");
    expect(markup).not.toContain("Private content");
    expect(authState.options).toEqual({ treatPendingAsSignedOut: false });
  });

  it("does not render the signed-out state when the auth response is still unresolved", () => {
    authState.isLoaded = true;

    const markup = renderGate();

    expect(markup).toContain("Checking your RunBuddy session");
    expect(markup).not.toContain("Sign in to RunBuddy");
    expect(markup).not.toContain("Private content");
  });

  it("shows the signed-out state after auth has loaded, with artifact-prefixed links", () => {
    authState.isLoaded = true;
    authState.isSignedIn = false;

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