import { describe, expect, it } from "vitest";
import {
  getArtifactRootPath,
  getArtifactRoutePath,
  normalizeArtifactBasePath,
} from "./auth-paths";

describe("artifact-aware authentication paths", () => {
  it("preserves the configured artifact base path for login and signup routes", () => {
    expect(getArtifactRoutePath("/runmatch/", "/sign-in")).toBe(
      "/runmatch/sign-in",
    );
    expect(getArtifactRoutePath("/runmatch/", "sign-up")).toBe(
      "/runmatch/sign-up",
    );
  });

  it("returns the artifact root for logout redirects", () => {
    expect(getArtifactRootPath("/runmatch/")).toBe("/runmatch");
  });

  it("keeps root-hosted routes at the site root", () => {
    expect(normalizeArtifactBasePath("/")).toBe("");
    expect(getArtifactRoutePath("/", "/sign-in")).toBe("/sign-in");
    expect(getArtifactRootPath("/")).toBe("/");
  });
});