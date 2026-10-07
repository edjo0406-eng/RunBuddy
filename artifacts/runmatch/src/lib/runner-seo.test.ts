import { describe, expect, it } from "vitest";
import { getCanonicalUrl, getPublicPageMetadata, getRunnerPageMetadata } from "./seo";

describe("runner route metadata", () => {
  it("never keeps the homepage canonical while a runner is loading", () => {
    const metadata = getPublicPageMetadata("/runner/31/")!;
    expect(metadata.noindex).toBe(true);
    expect(getCanonicalUrl(metadata)).toBe("https://RunBuddy.replit.app/runner/31");
    expect(metadata.title).not.toContain("Worldwide");
  });
  it("uses only public preview fields for anonymous runner metadata", () => {
    const runner = {
      id: 31, name: "Alex Example", city: "Example City", country: "Example Country",
      experience: "intermediate", profileType: "individual",
      bio: "PRIVATE BIO", trackingApps: { stravaUrl: "PRIVATE LINK" },
    };
    const metadata = getRunnerPageMetadata(runner);
    expect(metadata.title).toBe("Alex Example — Running partner in Example City, Example Country | RunBuddy");
    expect(metadata.description).toContain("intermediate runner in Example City, Example Country");
    expect(JSON.stringify(metadata)).not.toContain("PRIVATE");
    expect(metadata.noindex).toBe(false);
  });
  it("keeps authenticated/private views out of indexing", () => {
    const metadata = getRunnerPageMetadata({ id: 31, name: "Owner" }, true);
    expect(metadata.noindex).toBe(true);
    expect(metadata.structuredData).toBeUndefined();
  });
  it("returns ordinary public metadata when leaving a runner page", () => {
    const metadata = getPublicPageMetadata("/run-buddy")!;
    expect(metadata.noindex).not.toBe(true);
    expect(getCanonicalUrl(metadata)).toBe("https://RunBuddy.replit.app/run-buddy");
  });
});
