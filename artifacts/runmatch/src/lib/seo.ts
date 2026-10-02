export const SITE_URL = "https://RunBuddy.replit.app";
export const SOCIAL_IMAGE_URL = `${SITE_URL}/opengraph.jpg`;
export const SOCIAL_IMAGE_WIDTH = 1200;
export const SOCIAL_IMAGE_HEIGHT = 630;
export const SOCIAL_IMAGE_ALT =
  'RunBuddy runners at sunset with the message "Your next run has company."';
export const SITE_NAME = "RunBuddy";

export type PageMetadata = {
  title: string;
  description: string;
  canonicalPath: string;
};

export const PUBLIC_PAGE_METADATA = {
  home: {
    title: "Find Running Partners Worldwide | RunBuddy",
    description:
      "Meet runners who share your pace, city, and goals. RunBuddy helps you find local running partners, plan shared routes, and join a worldwide community.",
    canonicalPath: "/",
  },
  runBuddy: {
    title: "Find a Running Partner Near You | RunBuddy",
    description:
      "Search RunBuddy by city, country, and experience level to find compatible running partners for local routes, travel runs, and regular training.",
    canonicalPath: "/run-buddy",
  },
  runDate: {
    title: "Find Running Companions and Partners | RunBuddy",
    description:
      "RunDate is now part of RunBuddy. Discover runners by city, pace, and experience, then connect for local routes, travel runs, and shared training.",
    canonicalPath: "/run-date",
  },
} satisfies Record<string, PageMetadata>;

export function getPublicPageMetadata(pathname: string): PageMetadata | undefined {
  const normalizedPath = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;

  if (normalizedPath === "/") {
    return PUBLIC_PAGE_METADATA.home;
  }

  if (normalizedPath === "/run-buddy") {
    return PUBLIC_PAGE_METADATA.runBuddy;
  }

  if (normalizedPath === "/run-date") {
    return PUBLIC_PAGE_METADATA.runDate;
  }

  return undefined;
}

export function getCanonicalUrl(metadata: PageMetadata): string {
  return `${SITE_URL}${metadata.canonicalPath}`;
}