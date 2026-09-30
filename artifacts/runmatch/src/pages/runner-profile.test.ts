import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import RunnerProfile from "./runner-profile";

const profileMocks = vi.hoisted(() => ({
  profileId: 14,
  runner: null as Record<string, unknown> | null,
  currentRunnerId: 14 as number | null,
  mutate: vi.fn(),
  navigate: vi.fn(),
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
  useCreateConnection: () => ({
    mutate: profileMocks.mutate,
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
  return renderToStaticMarkup(createElement(RunnerProfile));
}

describe("runner profile actions", () => {
  beforeEach(() => {
    profileMocks.profileId = 14;
    profileMocks.currentRunnerId = 14;
    profileMocks.runner = makeRunner(14, "both");
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
});