/**
 * Semantic design tokens for the mobile app.
 *
 * These tokens mirror the naming conventions used in web artifacts (index.css)
 * so that multi-artifact projects share a cohesive visual identity.
 *
 * Replace the placeholder values below with values that match the project's
 * brand. If a sibling web artifact exists, read its index.css and convert the
 * HSL values to hex so both artifacts use the same palette.
 *
 * To add dark mode, add a `dark` key with the same token names.
 * The useColors() hook will automatically pick it up.
 */

const colors = {
  light: {
    text: '#162236',
    tint: '#B2E119',
    background: '#F8F7F1',
    foreground: '#162236',
    card: '#FEFDFB',
    cardForeground: '#162236',
    primary: '#B2E119',
    primaryForeground: '#162236',
    secondary: '#E56043',
    secondaryForeground: '#FEFDFB',
    muted: '#EDEAE3',
    mutedForeground: '#626E84',
    accent: '#C5E3E7',
    accentForeground: '#162236',
    destructive: '#C43E37',
    destructiveForeground: '#FEFDFB',
    border: '#E4E1D7',
    input: '#D8D4CA',
  },

  dark: {
    text: '#F9F7F0',
    tint: '#BDE830',
    background: '#0F1724',
    foreground: '#F9F7F0',
    card: '#172030',
    cardForeground: '#F9F7F0',
    primary: '#BDE830',
    primaryForeground: '#162236',
    secondary: '#E86F54',
    secondaryForeground: '#0F1724',
    muted: '#27303F',
    mutedForeground: '#A3ABB8',
    accent: '#2F565B',
    accentForeground: '#F9F7F0',
    destructive: '#D4554D',
    destructiveForeground: '#F9F7F0',
    border: '#2F394C',
    input: '#394356',
  },

  radius: 16,
};

export default colors;
