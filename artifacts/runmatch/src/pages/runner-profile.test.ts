import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import RunnerProfile from "./runner-profile";

const profileMocks = vi.hoisted(() => ({
  profileId: 14,
  runner: null as Record<string, unknown> | null,
  currentRunnerId: 14 as number | null,
  connection: null as Record<string, unknown> | null,
  mutate: vi.fn(),
  navigate: vi.fn(),
}));

vi.mock("@clerk/react", () => ({
  useAuth: () => ({ isSignedIn: true }),
}));

vi.mock("@workspace/api-client-react", () => ({
  useGetRunner: () => ({
    data: profileMocks.runner,
    isLoading: false,
  }),
  getGetRunnerQueryKey: () => ["runner"],
  useGetCurrentRunner: () => ({
    data: { runnerId: profileMocks.currentRunnerId },
    isError: false,
  }),
  getGetCurrentRunnerQueryKey: () => ["current-runner"],
  useListConnections: () => ({
    data: profileMocks.connection ? [profileMocks.connection] : [],
  }),
  getListConnectionsQueryKey: () => ["connections"],
  useDeleteConnection: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useCreateRunnerBlock: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useListRunnerBlocks: () => ({ data: [] }),
  getListRunnerBlocksQueryKey: () => ["runner-blocks"],
  useDeleteRunnerBlock: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useCreateRunnerReport: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useCreateConnection: () => ({
    mutate: profileMocks.mutate,
    isPending: false,
  }),
  useUpdateRunner: () => ({
    mutate: vi.fn(),
    isPending: false,
  }),
  useRequestUploadUrl: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
}));

vi.mock("wouter", () => ({
  useParams: () => ({ id: String(profileMocks.profileId) }),
  useLocation: () => ["/runner", profileMocks.navigate],
}));

vi.mock("@/components/layout/Navbar", () => ({ Navbar: () => null }));
vi.mock("@/components/layout/Footer", () => ({ Footer: () => null }));
vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));
vi.mock("@/lib/analytics", () => ({ trackEvent: vi.fn() }));

function makeRunner(id: number, lookingFor: "date" | "buddy" | "both") {
  return {
    id,
    name: "Jamie Runner",
    gender: "female",
    age: 29,
    profileType: "individual",
    city: "London",
    country: "United Kingdom",
    bio: "A runner in London.",
    lookingFor,
    runningStats: {},
    trackingApps: {},
  };
}

function renderProfile() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return renderToStaticMarkup(
    createElement(
      QueryClientProvider,
      { client: queryClient },
      createElement(RunnerProfile),
    ),
  );
}

describe("runner profile actions", () => {
  beforeEach(() => {
    profileMocks.profileId = 14;
    profileMocks.currentRunnerId = 14;
    profileMocks.runner = makeRunner(14, "both");
    profileMocks.connection = null;
    profileMocks.mutate = vi.fn();
    profileMocks.navigate = vi.fn();
  });

  it("does not offer connect or message actions on the signed-in runner's own profile", () => {
    const markup = renderProfile();

    expect(markup).not.toContain("Connect for Buddy");
    expect(markup).not.toContain("Send Message");
    expect(markup).toContain("This is your profile.");
  });

  it("shows connect and message actions for another runner looking for a buddy", () => {
    profileMocks.profileId = 28;
    profileMocks.runner = makeRunner(28, "both");

    const markup = renderProfile();

    expect(markup).toContain("Connect for Buddy");
    expect(markup).toContain("Send Message");
  });

  it("keeps messaging available when another runner is not looking for a buddy", () => {
    profileMocks.profileId = 28;
    profileMocks.runner = makeRunner(28, "date");

    const markup = renderProfile();

    expect(markup).not.toContain("Connect for Buddy");
    expect(markup).toContain("Send Message");
    expect(markup).toContain("This runner isn’t looking for a buddy");
  });

  it("offers unfriend for an accepted connection", () => {
    profileMocks.profileId = 28;
    profileMocks.runner = makeRunner(28, "both");
    profileMocks.connection = {
      id: 6,
      fromRunnerId: 14,
      toRunnerId: 28,
      status: "accepted",
    };

    const markup = renderProfile();

    expect(markup).toContain("Unfriend");
    expect(markup).toContain("Block");
    expect(markup).toContain("Report");
  });
});