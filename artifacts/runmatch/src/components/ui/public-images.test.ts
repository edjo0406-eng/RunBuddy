import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { Router } from "wouter";
import type { Runner } from "@workspace/api-client-react";
import { HeroImage } from "./hero-image";
import { RunnerCard } from "./runner-card";
import { runnerCardImageSizes } from "@/lib/public-images";

const runner = {
  id: 1,
  name: "Test Runner",
  gender: "male",
  profileType: "individual",
  city: "London",
  country: "UK",
} as Runner;

function renderCard(profile: Runner) {
  return renderToStaticMarkup(
    createElement(Router, { ssrPath: "/" }, createElement(RunnerCard, { runner: profile })),
  );
}

describe("public image delivery", () => {
  it("prioritizes the hero with responsive WebP and JPEG fallback", () => {
    const html = renderToStaticMarkup(createElement(HeroImage, { className: "h-full w-full" }));
    expect(html).toContain('type="image/webp"');
    expect(html).toContain("hero-bg-640.webp 640w");
    expect(html).toContain("hero-bg-1024.webp 1024w");
    expect(html).toContain("hero-bg-1408.webp 1408w");
    expect(html).toContain("hero-bg-1408.jpg 1408w");
    expect(html).toContain('width="1408" height="768"');
    expect(html).toContain('loading="eager"');
    expect(html).toContain('fetchPriority="high"');
    expect(html).toContain('alt="Runners moving together at dawn"');
    expect(html).not.toContain(".png");
  });

  it("keeps the decorative hero eager but lower priority and silent", () => {
    const html = renderToStaticMarkup(createElement(HeroImage, { decorative: true, className: "" }));
    expect(html).toContain('alt=""');
    expect(html).toContain('sizes="100vw"');
    expect(html).toContain('loading="eager"');
    expect(html).toContain('fetchPriority="low"');
  });

  it.each(["male", "female"])("defers %s card fallbacks with responsive sources", (gender) => {
    const html = renderCard({ ...runner, gender });
    const prefix = gender === "female" ? "avatar-f" : "avatar-m";
    expect(html).toContain('type="image/webp"');
    for (const width of [320, 640, 960]) {
      expect(html).toContain(`${prefix}-${width}.webp ${width}w`);
      expect(html).toContain(`${prefix}-${width}.jpg ${width}w`);
    }
    expect(html).toContain(`sizes="${runnerCardImageSizes}"`);
    expect(html).toContain('loading="lazy"');
    expect(html).toContain('decoding="async"');
    expect(html).toContain('width="960" height="960"');
    expect(html).toContain('alt="Test Runner"');
    expect(html).not.toContain(".png");
  });

  it("preserves uploaded photos without substituting default source sets", () => {
    const avatarUrl = "https://example.com/custom-photo.jpg";
    const html = renderCard({ ...runner, avatarUrl });
    expect(html).toContain(`src="${avatarUrl}"`);
    expect(html).toContain('loading="lazy"');
    expect(html).not.toContain("<source");
    expect(html).not.toContain("srcSet=");
    expect(html).not.toContain("avatar-m");
  });

  it("keeps all committed delivery variants under a 110 KB per-image budget", () => {
    for (const [name, widths] of [
      ["hero-bg", [640, 1024, 1408]],
      ["avatar-f", [320, 640, 960]],
      ["avatar-m", [320, 640, 960]],
    ] as const) {
      for (const width of widths) {
        for (const format of ["webp", "jpg"]) {
          const path = fileURLToPath(new URL(`../../assets/images/optimized/${name}-${width}.${format}`, import.meta.url));
          expect(statSync(path).size).toBeLessThan(110_000);
        }
      }
    }
  });
});
