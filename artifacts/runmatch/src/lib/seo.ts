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
  noindex?: boolean;
  structuredData?: unknown;
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
} satisfies Record<string, PageMetadata>;

export function getPublicPageMetadata(pathname: string): PageMetadata | undefined {
  const normalizedPath = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;

  if (normalizedPath === "/") {
    return PUBLIC_PAGE_METADATA.home;
  }

  if (normalizedPath === "/run-buddy") {
    return PUBLIC_PAGE_METADATA.runBuddy;
  }

  if (normalizedPath.startsWith("/runner/")) {
    return {
      title: "Runner profile | RunBuddy",
      description: "View this runner's public RunBuddy profile.",
      canonicalPath: normalizedPath,
      noindex: true,
    };
  }

  return undefined;
}

export function getCanonicalUrl(metadata: PageMetadata): string {
  return `${SITE_URL}${metadata.canonicalPath}`;
}

export function getRunnerPageMetadata(runner: {
  id: number;
  name: string;
  city?: string | null;
  country?: string | null;
  experience?: string | null;
  profileType?: string | null;
  clubName?: string | null;
}, noindex = false): PageMetadata {
  const name = runner.profileType !== "individual" && runner.clubName ? runner.clubName : runner.name;
  const location = [runner.city, runner.country].filter(Boolean).join(", ");
  const canonicalPath = `/runner/${runner.id}`;
  const description = `${name} is a${runner.experience ? ` ${runner.experience}` : ""} runner${location ? ` in ${location}` : ""}. View this public RunBuddy profile and sign in to connect for a shared run.`;
  return {
    title: `${name}${location ? ` — Running partner in ${location}` : " — Runner profile"} | RunBuddy`,
    description,
    canonicalPath,
    noindex,
    structuredData: noindex ? undefined : {
      "@context": "https://schema.org",
      "@type": "ProfilePage",
      url: `${SITE_URL}${canonicalPath}`,
      name,
      description,
      mainEntity: {
        "@type": runner.profileType === "individual" ? "Person" : "SportsOrganization",
        name,
        url: `${SITE_URL}${canonicalPath}`,
      },
    },
  };
}

export function applyPageMetadata(metadata: PageMetadata): void {
  const canonicalUrl = getCanonicalUrl(metadata);
  document.title = metadata.title;
  document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.setAttribute("href", canonicalUrl);
  const setMeta = (attribute: "name" | "property", key: string, content: string) => {
    let element = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`);
    if (!element) {
      element = document.createElement("meta");
      element.setAttribute(attribute, key);
      document.head.appendChild(element);
    }
    element.setAttribute("content", content);
  };
  setMeta("name", "description", metadata.description);
  setMeta("name", "robots", metadata.noindex ? "noindex, nofollow" : "index, follow");
  for (const [key, value] of Object.entries({
    title: metadata.title,
    description: metadata.description,
    url: canonicalUrl,
    type: metadata.canonicalPath.startsWith("/runner/") ? "profile" : "website",
    site_name: SITE_NAME,
    image: SOCIAL_IMAGE_URL,
    "image:width": String(SOCIAL_IMAGE_WIDTH),
    "image:height": String(SOCIAL_IMAGE_HEIGHT),
    "image:alt": SOCIAL_IMAGE_ALT,
  })) setMeta("property", `og:${key}`, value);
  for (const [key, value] of Object.entries({
    card: "summary_large_image",
    title: metadata.title,
    description: metadata.description,
    image: SOCIAL_IMAGE_URL,
    "image:alt": SOCIAL_IMAGE_ALT,
  })) setMeta("name", `twitter:${key}`, value);
  document.head.querySelectorAll("script[data-public-seo]").forEach((element) => element.remove());
  if (metadata.structuredData) {
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.setAttribute("data-public-seo", "");
    script.textContent = JSON.stringify(metadata.structuredData);
    document.head.appendChild(script);
  }
}