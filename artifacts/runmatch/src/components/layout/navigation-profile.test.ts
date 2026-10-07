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
    return { data: queryClient.getQueryData(options.query.queryKey) };
  },
  useGetUnreadCount: () => ({ data: { count: 0 } }),
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
});
