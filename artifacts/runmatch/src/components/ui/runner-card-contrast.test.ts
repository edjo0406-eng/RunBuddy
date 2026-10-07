import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync(new URL("../../index.css", import.meta.url), "utf8");
const card = readFileSync(new URL("./runner-card.tsx", import.meta.url), "utf8");

function themeColors(selector: string) {
  const block = css.slice(css.indexOf(`${selector} {`)).split("}")[0];
  return (token: string) => {
    const match = block.match(new RegExp(`--${token}:\\s*([\\d.]+) ([\\d.]+)% ([\\d.]+)%`));
    if (!match) throw new Error(`Missing ${selector} token: ${token}`);
    const [, h, s, l] = match.map(Number);
    const saturation = s / 100;
    const lightness = l / 100;
    const amplitude = saturation * Math.min(lightness, 1 - lightness);
    return [0, 8, 4].map((offset) => {
      const k = (offset + h / 30) % 12;
      return lightness - amplitude * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    });
  };
}

function contrast(foreground: number[], background: number[]) {
  const luminance = (rgb: number[]) =>
    rgb.reduce((sum, channel, i) => {
      const linear = channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
      return sum + linear * [0.2126, 0.7152, 0.0722][i];
    }, 0);
  const values = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
  return (values[0] + 0.05) / (values[1] + 0.05);
}

describe("runner card normal-sized text contrast", () => {
  it("uses the tested color pairs on the profile type, pace, and profile link", () => {
    expect(card).toContain('mt-1 rounded-full bg-primary text-primary-foreground hover:bg-primary');
    expect(card).toContain('border-primary/20 text-card-foreground');
    expect(card).toContain('bg-primary/10 py-2 text-center text-sm font-medium text-card-foreground');
    expect(card).toContain('hover:bg-primary hover:text-primary-foreground');
    expect(card).not.toContain("bg-primary/15 text-primary");
    expect(card).not.toContain("border-primary/20 text-primary");
  });

  for (const theme of [":root", ".dark"]) {
    it(`${theme} meets WCAG AA for pace, link, hover, and opaque photo-overlay badge`, () => {
      const color = themeColors(theme);
      const background = color("card");
      const primary = color("primary");
      const tintedBackground = primary.map((channel, i) => channel * 0.1 + background[i] * 0.9);
      expect(contrast(color("card-foreground"), background)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(color("card-foreground"), tintedBackground)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(color("primary-foreground"), primary)).toBeGreaterThanOrEqual(4.5);
    });
  }
});
