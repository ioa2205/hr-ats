import { describe, expect, it } from "vitest";

const themes = {
  light: {
    canvas: "#F6F3EC",
    surface: "#FFFFFF",
    text: "#171A1F",
    textMuted: "#4F5963",
    textSubtle: "#65707A",
    primary: "#0B57A3",
    onPrimary: "#FFFFFF",
    accent: "#C84E18",
    onAccent: "#FFFFFF",
    danger: "#B4232C",
    onDanger: "#FFFFFF",
  },
  dark: {
    canvas: "#111416",
    surface: "#181C1F",
    text: "#F5F3EE",
    textMuted: "#C1C6C9",
    textSubtle: "#A7AFB4",
    primary: "#79B9F2",
    onPrimary: "#06233E",
    accent: "#FF8C55",
    onAccent: "#3B080C",
    danger: "#FF9A9E",
    onDanger: "#3B080C",
  },
} as const;

function luminance(hex: string) {
  const channels = hex
    .slice(1)
    .match(/../g)!
    .map((channel) => Number.parseInt(channel, 16) / 255)
    .map((channel) => (channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4));
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrast(a: string, b: string) {
  const first = luminance(a);
  const second = luminance(b);
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
}

describe("TezHR semantic contrast contract", () => {
  for (const [themeName, theme] of Object.entries(themes)) {
    it(`${themeName} text and brand roles meet WCAG AA`, () => {
      const pairs = [
        [theme.text, theme.canvas],
        [theme.textMuted, theme.canvas],
        [theme.textSubtle, theme.canvas],
        [theme.primary, theme.surface],
        [theme.onPrimary, theme.primary],
        [theme.accent, theme.surface],
        [theme.onAccent, theme.accent],
        [theme.danger, theme.surface],
        [theme.onDanger, theme.danger],
      ] as const;

      for (const [foreground, background] of pairs) {
        expect(contrast(foreground, background)).toBeGreaterThanOrEqual(4.5);
      }
    });
  }
});
