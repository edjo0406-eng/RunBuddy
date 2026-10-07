import { createElement, type ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const pageMocks = vi.hoisted(() => ({
  myRunnerId: null as number | null,
  loadingIdentity: false,
  identityError: false,
}));

vi.mock("@/hooks/use-identity", () => ({
  useIdentity: () => ({
    myRunnerId: pageMocks.myRunnerId,
    isLoading: pageMocks.loadingIdentity,
    isError: pageMocks.identityError,
  }),
}));

vi.mock("@/components/layout/Navbar", () => ({
  Navbar: () => createElement("header", null, "Navigation"),
}));

vi.mock("@/components/layout/Footer", () => ({
  Footer: () => createElement("footer", null, "Footer"),
}));

vi.mock("@workspace/api-client-react", () => ({
  getGetInboxQueryKey: () => ["inbox"],
  getGetRunnerQueryKey: (id: number) => ["runner", id],
  getGetConversationQueryKey: () => ["conversation"],
  useGetInbox: () => ({ data: undefined, isLoading: false }),
  useGetRunner: () => ({ data: undefined }),
  useGetConversation: () => ({ data: undefined, isLoading: false }),
  useSendMessage: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({
    invalidateQueries: vi.fn(),
  }),
}));

vi.mock("wouter", () => ({
  Link: ({
    href,
    children,
    ...props
  }: ComponentProps<"a"> & { href: string }) =>
    createElement("a", { ...props, href }, children),
  useParams: () => ({ otherId: "42" }),
}));

import Inbox from "./inbox";
import ConversationPage from "./conversation";

describe("website messaging setup", () => {
  beforeEach(() => {
    pageMocks.myRunnerId = null;
    pageMocks.loadingIdentity = false;
    pageMocks.identityError = false;
  });

  it("directs Inbox users without a runner profile to create one", () => {
    const markup = renderToStaticMarkup(createElement(Inbox));

    expect(markup).toContain("Create your runner profile");
    expect(markup).toContain('href="/create-profile"');
    expect(markup).not.toContain("Select your runner profile");
    expect(markup).not.toContain("I am…");
  });

  it("directs Messages users without a runner profile to create one", () => {
    const markup = renderToStaticMarkup(createElement(ConversationPage));

    expect(markup).toContain("Create your runner profile");
    expect(markup).toContain('href="/create-profile"');
    expect(markup).not.toContain("Who are you?");
    expect(markup).not.toContain("I am…");
  });

  it("does not show profile setup while the authenticated identity is loading", () => {
    pageMocks.loadingIdentity = true;

    const inboxMarkup = renderToStaticMarkup(createElement(Inbox));
    const conversationMarkup = renderToStaticMarkup(
      createElement(ConversationPage),
    );

    expect(inboxMarkup).toContain("Checking your runner profile");
    expect(conversationMarkup).toContain("Checking your runner profile");
    expect(inboxMarkup).not.toContain('href="/create-profile"');
    expect(conversationMarkup).not.toContain('href="/create-profile"');
  });
});
