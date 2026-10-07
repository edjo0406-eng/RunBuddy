import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const identityMocks = vi.hoisted(() => ({
  isLoaded: true,
  isSignedIn: true as boolean | null,
  userId: "clerk-user-1" as string | null,
  currentRunnerId: 41 as number | null,
  isLoading: false,
  isError: false,
  queryOptions: [] as { enabled?: boolean; queryKey?: unknown[] }[],
}));

vi.mock("@clerk/react", () => ({
  useAuth: () => identityMocks,
}));

vi.mock("@workspace/api-client-react", () => ({
  getGetCurrentRunnerQueryKey: () => ["/api/runners/me"],
  useGetCurrentRunner: (options: { query: { enabled?: boolean; queryKey?: unknown[] } }) => {
    identityMocks.queryOptions.push(options.query);
    return {
      data: { runnerId: identityMocks.currentRunnerId },
      isLoading: identityMocks.isLoading,
      isError: identityMocks.isError,
    };
  },
}));

import { useIdentity } from "./use-identity";

function IdentityOutput() {
  const { myRunnerId, isLoading, isError } = useIdentity();
  return createElement(
    "output",
    null,
    `${myRunnerId ?? "no-profile"}|${isLoading}|${isError}`,
  );
}

describe("authenticated runner identity", () => {
  beforeEach(() => {
    identityMocks.isLoaded = true;
    identityMocks.isSignedIn = true;
    identityMocks.userId = "clerk-user-1";
    identityMocks.currentRunnerId = 41;
    identityMocks.isLoading = false;
    identityMocks.isError = false;
    identityMocks.queryOptions = [];
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("uses the authenticated runner returned by the server instead of a cached browser ID", () => {
    const getItem = vi.fn(() => "99");
    vi.stubGlobal("localStorage", { getItem });

    const markup = renderToStaticMarkup(createElement(IdentityOutput));

    expect(markup).toContain("41|false|false");
    expect(getItem).not.toHaveBeenCalled();
    expect(identityMocks.queryOptions).toContainEqual({
      enabled: true,
      queryKey: ["/api/runners/me", "clerk-user-1"],
    });
  });

  it("reports a completed no-profile response separately from loading", () => {
    identityMocks.currentRunnerId = null;

    const markup = renderToStaticMarkup(createElement(IdentityOutput));

    expect(markup).toContain("no-profile|false|false");
  });

  it("does not expose cached runner data when the account is signed out", () => {
    identityMocks.isSignedIn = false;

    const markup = renderToStaticMarkup(createElement(IdentityOutput));

    expect(markup).toContain("no-profile|false|false");
    expect(identityMocks.queryOptions[0]?.enabled).toBe(false);
  });
});
