import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import EditRunnerProfile, {
  runnerEditBodyFromForm,
  runnerProfileEditSchema,
  runnerToFormValues,
} from "./edit-runner-profile";

const editorMocks = vi.hoisted(() => ({
  profileId: 14,
  currentRunnerId: 14 as number | null,
  runner: null as Record<string, unknown> | null,
  navigate: vi.fn(),
}));

vi.mock("@clerk/react", () => ({
  useAuth: () => ({ isSignedIn: true }),
}));

vi.mock("@workspace/api-client-react", () => ({
  getGetCurrentRunnerQueryKey: () => ["current-runner"],
  getGetRunnerQueryKey: () => ["runner"],
  useGetRunner: () => ({
    data: editorMocks.runner,
    isLoading: false,
    isError: false,
  }),
  useGetCurrentRunner: () => ({
    data: { runnerId: editorMocks.currentRunnerId },
    isLoading: false,
    isError: false,
  }),
  useUpdateRunner: () => ({
    mutate: vi.fn(),
    isPending: false,
    isSuccess: false,
    isError: false,
  }),
}));

vi.mock("wouter", () => ({
  useParams: () => ({ id: String(editorMocks.profileId) }),
  useLocation: () => ["/runner/14/edit", editorMocks.navigate],
}));

vi.mock("@/components/layout/Navbar", () => ({ Navbar: () => null }));
vi.mock("@/components/layout/Footer", () => ({ Footer: () => null }));
vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

function makeRunner(id: number) {
  return {
    id,
    name: "Jamie Runner",
    age: 29,
    gender: "female",
    profileType: "individual",
    city: "London",
    country: "United Kingdom",
    bio: "A runner in London.",
    lookingFor: "buddy",
    experience: "intermediate",
    runningStats: {
      weeklyMileageKm: 32,
      personalBest5k: "25:00",
      preferredRunTypes: ["trail"],
    },
    trackingApps: { stravaUrl: "https://strava.com/athletes/123" },
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  } as unknown as import("@workspace/api-client-react").Runner;
}

function renderEditor() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return renderToStaticMarkup(
    createElement(
      QueryClientProvider,
      { client: queryClient },
      createElement(EditRunnerProfile),
    ),
  );
}

describe("website runner profile editor", () => {
  beforeEach(() => {
    editorMocks.profileId = 14;
    editorMocks.currentRunnerId = 14;
    editorMocks.runner = makeRunner(14);
    editorMocks.navigate = vi.fn();
  });

  it("shows the full editor only when the signed-in runner owns the profile", () => {
    const markup = renderEditor();

    expect(markup).toContain("Save profile");
    expect(markup).toContain('data-testid="input-name"');
    expect(markup).toContain('data-testid="input-city"');
    expect(markup).toContain('data-testid="input-bio"');
    expect(markup).toContain('data-testid="input-strava"');
    expect(runnerToFormValues(editorMocks.runner as unknown as import("@workspace/api-client-react").Runner).trackingApps.stravaUrl)
      .toBe("https://strava.com/athletes/123");
  });

  it("does not render editable fields when the signed-in runner is not the owner", () => {
    editorMocks.currentRunnerId = 28;

    const markup = renderEditor();

    expect(markup).toContain("This profile isn’t yours to edit");
    expect(markup).not.toContain("Save profile");
    expect(markup).not.toContain('data-testid="input-name"');
  });

  it("validates required profile details, pace formats, and tracking URLs", () => {
    const validForm = {
      name: "Jamie Runner",
      age: 29,
      gender: "",
      city: "London",
      country: "United Kingdom",
      bio: "",
      profileType: "individual",
      clubName: "",
      clubDescription: "",
      clubWebsite: "",
      clubSocialUrl: "",
      clubAssociation: "",
      lookingFor: "buddy",
      experience: "intermediate",
      weeklyMileageKm: "",
      totalRaces: "",
      avgPacePerKm: "5:30",
      personalBest5k: "",
      personalBest10k: "",
      personalBestHalfMarathon: "",
      personalBestMarathon: "",
      preferredRunTypes: ["trail"],
      trackingApps: {
        stravaUrl: "https://strava.com/athletes/123",
        garminUrl: "",
        nikeRunClubUrl: "",
        polarUrl: "",
        suuntoUrl: "",
        wahooPlan: "",
        appleHealthConnected: false,
      },
      travelCity: "",
      travelCountry: "",
      travelUntil: "",
      travelNote: "",
    };

    expect(runnerProfileEditSchema.safeParse(validForm).success).toBe(true);
    expect(
      runnerProfileEditSchema.safeParse({
        ...validForm,
        avgPacePerKm: "5 minutes",
        trackingApps: { ...validForm.trackingApps, stravaUrl: "javascript:alert(1)" },
      }).success,
    ).toBe(false);
    expect(
      runnerProfileEditSchema.safeParse({ ...validForm, city: "X" }).success,
    ).toBe(false);
  });

  it("sends explicit nulls for cleared fields while preserving other saved details", () => {
    const runner = makeRunner(14);
    const formValues = runnerToFormValues(runner);
    formValues.trackingApps.garminUrl = "";
    formValues.trackingApps.stravaUrl = "";
    formValues.weeklyMileageKm = "";

    const body = runnerEditBodyFromForm(formValues, runner);

    expect(body.trackingApps?.garminUrl).toBeNull();
    expect(body.trackingApps?.garminConnectUrl).toBeNull();
    expect(body.trackingApps?.stravaUrl).toBeNull();
    expect(body.runningStats?.weeklyMileageKm).toBeNull();
    expect(body.runningStats?.personalBest5k).toBe("25:00");
    expect(body.runningStats?.preferredRunTypes).toEqual(["trail"]);
  });
});
