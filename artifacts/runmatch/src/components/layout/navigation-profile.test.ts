import { createElement, type ComponentProps, type ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  QueryClient,
  QueryClientProvider,
  useQueryClient,
} from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Navbar } from "./Navbar";
import { MobileNav } from "./MobileNav";

const navigationMocks = vi.hoisted(() => ({
  userId: "clerk-user-1",
  currentRunnerQueryKeys: [] as unknown[][],
  failedRunnerLookups: new Set<string>(),
}));

vi.mock("@clerk/react", () => ({
  useAuth: () => ({
    isLoaded: true,
    isSignedIn: true,
    userId: navigationMocks.userId,
  }),
  useClerk: () => ({ signOut: vi.fn() }),
}));

vi.mock("@workspace/api-client-react", () => ({
  getGetCurrentRunnerQueryKey: () => ["current-runner"],
  getGetUnreadCountQueryKey: () => ["unread-count"],
  useGetCurrentRunner: (options: { query: { queryKey: unknown[] } }) => {
    navigationMocks.currentRunnerQueryKeys.push(options.query.queryKey);
    const queryClient = useQueryClient();
    return {
      data: queryClient.getQueryData(options.query.queryKey),
      isError: navigationMocks.failedRunnerLookups.has(
        String(options.query.queryKey.at(-1)),
      ),
    };
  },
  useGetUnreadCount: (options: { query: { queryKey: unknown[] } }) => {
    const queryClient = useQueryClient();
    return {
      data:
        queryClient.getQueryData<{ count: number }>(options.query.queryKey) ??
        { count: 0 },
    };
  },
}));

vi.mock("@/hooks/use-identity", () => ({
  useIdentity: () => ({ myRunnerId: 99 }),
}));

vi.mock("@/hooks/use-notifications", () => ({
  useNotifications: vi.fn(),
}));

vi.mock("wouter", () => ({
  Link: ({
    href,
    children,
    ...props
  }: ComponentProps<"a"> & { href: string }) =>
    createElement("a", { ...props, href }, children),
  useLocation: () => ["/run-buddy"],
}));

function createNavigationQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
}

function renderNavigation(
  element: ReactElement,
  queryClient = createNavigationQueryClient(),
) {
  return renderToStaticMarkup(
    createElement(QueryClientProvider, { client: queryClient }, element),
  );
}

function cacheRunner(
  queryClient: QueryClient,
  userId: string,
  runnerId: number | null,
) {
  queryClient.setQueryData(["current-runner", userId], { runnerId });
}

describe("signed-in profile navigation", () => {
  beforeEach(() => {
    navigationMocks.userId = "clerk-user-1";
    navigationMocks.currentRunnerQueryKeys = [];
    navigationMocks.failedRunnerLookups.clear();
  });

  it("keeps both inbox badges on the newest count when an older refresh settles late", async () => {
    const queryClient = createNavigationQueryClient();
    const unreadQueryKey = ["unread-count", navigationMocks.userId];
    queryClient.setQueryData(unreadQueryKey, { count: 1 });

    const renderUnreadBadges = () =>
      renderNavigation(
        createElement("div", null, createElement(Navbar), createElement(MobileNav)),
        queryClient,
      );
    const initialMarkup = renderUnreadBadges();
    expect(initialMarkup).toMatch(
      /data-testid="badge-unread-count"[^>]*>1<\/span>/,
    );
    expect(initialMarkup).toMatch(
      /data-testid="badge-mobile-unread-count"[^>]*>1<\/span>/,
    );

    let resolveOlderResponse!: (value: { count: number }) => void;
    let notifyOlderRequestStarted!: () => void;
    const olderRequestStarted = new Promise<void>((resolve) => {
      notifyOlderRequestStarted = resolve;
    });
    const olderResponse = new Promise<{ count: number }>((resolve) => {
      resolveOlderResponse = resolve;
    });
    const olderRefresh = queryClient.fetchQuery({
      queryKey: unreadQueryKey,
      staleTime: 0,
      queryFn: ({ signal }) => {
        // This transport ignores abort and completes only after the newer refresh.
        void signal;
        notifyOlderRequestStarted();
        return olderResponse;
      },
    });
    const olderRefreshResult = olderRefresh.then(
      () => null,
      (error: unknown) => error,
    );
    await olderRequestStarted;

    await queryClient.cancelQueries({
      queryKey: unreadQueryKey,
      exact: true,
    });
    await expect(
      queryClient.fetchQuery({
        queryKey: unreadQueryKey,
        staleTime: 0,
        queryFn: async () => ({ count: 2 }),
      }),
    ).resolves.toEqual({ count: 2 });
    const newerMarkup = renderUnreadBadges();
    expect(newerMarkup).toMatch(
      /data-testid="badge-unread-count"[^>]*>2<\/span>/,
    );
    expect(newerMarkup).toMatch(
      /data-testid="badge-mobile-unread-count"[^>]*>2<\/span>/,
    );

    resolveOlderResponse({ count: 1 });
    await expect(olderResponse).resolves.toEqual({ count: 1 });
    await olderRefreshResult;
    expect(queryClient.getQueryData(unreadQueryKey)).toEqual({ count: 2 });
    const finalMarkup = renderUnreadBadges();
    expect(finalMarkup).toMatch(
      /data-testid="badge-unread-count"[^>]*>2<\/span>/,
    );
    expect(finalMarkup).toMatch(
      /data-testid="badge-mobile-unread-count"[^>]*>2<\/span>/,
    );
  });

  it("links desktop navigation to the server-authenticated runner, not a cached profile ID", () => {
    const queryClient = createNavigationQueryClient();
    cacheRunner(queryClient, "clerk-user-1", 14);
    const markup = renderNavigation(createElement(Navbar), queryClient);

    expect(markup).toContain('data-testid="link-nav-my-profile"');
    expect(markup).toContain('href="/runner/14"');
    expect(markup).not.toContain('href="/runner/99"');
    expect(navigationMocks.currentRunnerQueryKeys).toContainEqual([
      "current-runner",
      "clerk-user-1",
    ]);
  });

  it("links mobile navigation to the server-authenticated runner, not a cached profile ID", () => {
    const queryClient = createNavigationQueryClient();
    cacheRunner(queryClient, "clerk-user-1", 14);
    const markup = renderNavigation(createElement(MobileNav), queryClient);

    expect(markup).toContain('data-testid="link-mobile-my-profile"');
    expect(markup).toContain('href="/runner/14"');
    expect(markup).not.toContain('href="/runner/99"');
    expect(navigationMocks.currentRunnerQueryKeys).toContainEqual([
      "current-runner",
      "clerk-user-1",
    ]);
  });

  it("offers profile setup instead of a runner link when the account has no profile", () => {
    const queryClient = createNavigationQueryClient();
    cacheRunner(queryClient, "clerk-user-1", null);

    const desktopMarkup = renderNavigation(createElement(Navbar), queryClient);
    const mobileMarkup = renderNavigation(createElement(MobileNav), queryClient);

    expect(desktopMarkup).toContain('data-testid="link-nav-create-profile"');
    expect(mobileMarkup).toContain('data-testid="link-mobile-create-profile"');
    expect(desktopMarkup).toContain('href="/create-profile"');
    expect(mobileMarkup).toContain('href="/create-profile"');
    expect(desktopMarkup).not.toContain('href="/runner/99"');
    expect(mobileMarkup).not.toContain('href="/runner/99"');
  });

  it("updates desktop and mobile profile links when Clerk switches to another runner account", () => {
    const queryClient = createNavigationQueryClient();
    cacheRunner(queryClient, "clerk-user-1", 14);
    cacheRunner(queryClient, "clerk-user-2", 28);

    navigationMocks.userId = "clerk-user-1";
    const firstAccountMarkup = renderNavigation(
      createElement("div", null, createElement(Navbar), createElement(MobileNav)),
      queryClient,
    );
    expect(firstAccountMarkup).toContain('href="/runner/14"');

    navigationMocks.userId = "clerk-user-2";
    const secondAccountMarkup = renderNavigation(
      createElement("div", null, createElement(Navbar), createElement(MobileNav)),
      queryClient,
    );

    expect(secondAccountMarkup).toContain('href="/runner/28"');
    expect(secondAccountMarkup).not.toContain('href="/runner/14"');
    expect(navigationMocks.currentRunnerQueryKeys).toContainEqual([
      "current-runner",
      "clerk-user-1",
    ]);
    expect(navigationMocks.currentRunnerQueryKeys).toContainEqual([
      "current-runner",
      "clerk-user-2",
    ]);
  });

  it.each([
    { description: "profile", lateRunnerId: 14 },
    { description: "no-profile", lateRunnerId: null },
  ])(
    "ignores account A's late $description response after switching to account B",
    ({ lateRunnerId }) => {
      const queryClient = createNavigationQueryClient();
      navigationMocks.userId = "clerk-user-1";
      renderNavigation(
        createElement("div", null, createElement(Navbar), createElement(MobileNav)),
        queryClient,
      );

      navigationMocks.userId = "clerk-user-2";
      cacheRunner(queryClient, "clerk-user-2", 28);
      const accountBMarkup = renderNavigation(
        createElement("div", null, createElement(Navbar), createElement(MobileNav)),
        queryClient,
      );
      expect(accountBMarkup).toContain('href="/runner/28"');

      // Simulate account A's pending request completing after account B is active.
      cacheRunner(queryClient, "clerk-user-1", lateRunnerId);
      const markupAfterLateResponse = renderNavigation(
        createElement("div", null, createElement(Navbar), createElement(MobileNav)),
        queryClient,
      );

      expect(markupAfterLateResponse).toContain(
        'data-testid="link-nav-my-profile"',
      );
      expect(markupAfterLateResponse).toContain(
        'data-testid="link-mobile-my-profile"',
      );
      expect(markupAfterLateResponse).toContain('href="/runner/28"');
      expect(markupAfterLateResponse).not.toContain('href="/runner/14"');
      expect(markupAfterLateResponse).not.toContain(
        'data-testid="link-nav-create-profile"',
      );
      expect(markupAfterLateResponse).not.toContain(
        'data-testid="link-mobile-create-profile"',
      );
    },
  );

  it("does not show the previous profile while the switched account has no profile result yet", () => {
    const queryClient = createNavigationQueryClient();
    cacheRunner(queryClient, "clerk-user-1", 14);

    navigationMocks.userId = "clerk-user-1";
    renderNavigation(
      createElement("div", null, createElement(Navbar), createElement(MobileNav)),
      queryClient,
    );

    navigationMocks.userId = "clerk-user-2";
    const markup = renderNavigation(
      createElement("div", null, createElement(Navbar), createElement(MobileNav)),
      queryClient,
    );

    expect(markup).not.toContain('href="/runner/14"');
    expect(markup).not.toContain('data-testid="link-nav-my-profile"');
    expect(markup).not.toContain('data-testid="link-mobile-my-profile"');
  });

  it("hides profile and setup links when the switched account lookup fails, then recovers", () => {
    const queryClient = createNavigationQueryClient();
    cacheRunner(queryClient, "clerk-user-1", 14);
    cacheRunner(queryClient, "clerk-user-2", null);

    navigationMocks.userId = "clerk-user-1";
    renderNavigation(
      createElement("div", null, createElement(Navbar), createElement(MobileNav)),
      queryClient,
    );

    navigationMocks.userId = "clerk-user-2";
    navigationMocks.failedRunnerLookups.add("clerk-user-2");
    const failedLookupMarkup = renderNavigation(
      createElement("div", null, createElement(Navbar), createElement(MobileNav)),
      queryClient,
    );

    expect(failedLookupMarkup).not.toContain('href="/runner/14"');
    expect(failedLookupMarkup).not.toContain('data-testid="link-nav-my-profile"');
    expect(failedLookupMarkup).not.toContain('data-testid="link-mobile-my-profile"');
    expect(failedLookupMarkup).not.toContain('data-testid="link-nav-create-profile"');
    expect(failedLookupMarkup).not.toContain('data-testid="link-mobile-create-profile"');
    expect(failedLookupMarkup).toContain(
      'data-testid="status-nav-profile-navigation-error"',
    );
    expect(failedLookupMarkup).toContain(
      'data-testid="status-mobile-profile-navigation-error"',
    );
    expect(failedLookupMarkup).toContain('data-testid="button-nav-retry-profile"');
    expect(failedLookupMarkup).toContain(
      'data-testid="button-mobile-retry-profile"',
    );
    expect(failedLookupMarkup).toContain(
      "Profile navigation couldn’t be loaded.",
    );

    navigationMocks.failedRunnerLookups.delete("clerk-user-2");
    const recoveredMarkup = renderNavigation(
      createElement("div", null, createElement(Navbar), createElement(MobileNav)),
      queryClient,
    );

    expect(recoveredMarkup).toContain('data-testid="link-nav-create-profile"');
    expect(recoveredMarkup).toContain('data-testid="link-mobile-create-profile"');

    cacheRunner(queryClient, "clerk-user-2", 28);
    navigationMocks.failedRunnerLookups.add("clerk-user-2");
    const failedRefreshMarkup = renderNavigation(
      createElement("div", null, createElement(Navbar), createElement(MobileNav)),
      queryClient,
    );

    expect(failedRefreshMarkup).not.toContain('href="/runner/14"');
    expect(failedRefreshMarkup).not.toContain('href="/runner/28"');
    expect(failedRefreshMarkup).not.toContain('data-testid="link-nav-my-profile"');
    expect(failedRefreshMarkup).not.toContain('data-testid="link-mobile-my-profile"');
    expect(failedRefreshMarkup).not.toContain('data-testid="link-nav-create-profile"');
    expect(failedRefreshMarkup).not.toContain('data-testid="link-mobile-create-profile"');

    navigationMocks.failedRunnerLookups.delete("clerk-user-2");
    const recoveredProfileMarkup = renderNavigation(
      createElement("div", null, createElement(Navbar), createElement(MobileNav)),
      queryClient,
    );

    expect(recoveredProfileMarkup).toContain('href="/runner/28"');
  });
});
