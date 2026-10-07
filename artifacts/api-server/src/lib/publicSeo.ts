// Keep this shape limited to the anonymous discovery allowlist.
export type PublicRunner = {
  id: number;
  name: string;
  city: string | null;
  country: string | null;
  profileType: string;
  clubName: string | null;
  experience: string | null;
};

export const SITE_URL = "https://RunBuddy.replit.app";
export const DIRECTORY_PAGE_SIZE = 100;
const socialImage = `${SITE_URL}/opengraph.jpg`;

export function escapeHtml(value: unknown): string {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character]!);
}

export function runnerName(runner: PublicRunner): string {
  return runner.profileType !== "individual" && runner.clubName
    ? runner.clubName
    : runner.name;
}

const navigation = `<header><nav aria-label="Primary navigation"><a href="/">RunBuddy home</a> · <a href="/run-buddy">Find a RunBuddy</a></nav></header>`;

export type PublicPage = {
  title: string;
  description: string;
  canonicalPath: string;
  content: string;
  structuredData?: unknown;
  noindex?: boolean;
};

export function profilePage(runner: PublicRunner): PublicPage {
  const name = runnerName(runner);
  const location = [runner.city, runner.country].filter(Boolean).join(", ");
  const canonicalPath = `/runner/${runner.id}`;
  const description = `${name} is a${runner.experience ? ` ${runner.experience}` : ""} runner${location ? ` in ${location}` : ""}. View this public RunBuddy profile and sign in to connect for a shared run.`;
  return {
    title: `${name}${location ? ` — Running partner in ${location}` : " — Runner profile"} | RunBuddy`,
    description,
    canonicalPath,
    content: `${navigation}<main><h1>${escapeHtml(name)} — RunBuddy profile</h1>
      <p>${escapeHtml(description)}</p>
      <dl><dt>Location</dt><dd>${escapeHtml(location)}</dd><dt>Experience</dt><dd>${escapeHtml(runner.experience)}</dd></dl>
      <p>This runner has chosen to appear in the public directory. Sign in to view additional runner-provided details and connect.</p>
      <p><a href="/run-buddy">Find more running partners</a></p></main>`,
    structuredData: {
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

export function directoryPage(runners: PublicRunner[], page: number, hasNext: boolean): PublicPage {
  const canonicalPath = `/run-buddy${page > 1 ? `?page=${page}` : ""}`;
  const pageLink = (number: number) => `/run-buddy${number > 1 ? `?page=${number}` : ""}`;
  return {
    title: `Find a Running Partner Near You${page > 1 ? ` — Page ${page}` : ""} | RunBuddy`,
    description: "Browse runners who have chosen to be listed on RunBuddy. Find running partners by city, country, and experience, then sign in to connect.",
    canonicalPath,
    content: `${navigation}<main><h1>Find a RunBuddy near you</h1>
      <p>Browse runners who choose to appear in discovery. Find a local running partner or a companion for your next travel run.</p>
      <section aria-labelledby="public-runners"><h2 id="public-runners">Public running partners</h2>
      ${runners.length ? `<ul>${runners.map((runner) => `<li><a href="/runner/${runner.id}">${escapeHtml(runnerName(runner))} — running partner in ${escapeHtml([runner.city, runner.country].filter(Boolean).join(", "))}</a> · ${escapeHtml(runner.experience)}</li>`).join("")}</ul>` : "<p>No public runners are listed on this page.</p>"}
      </section><nav aria-label="Directory pages">${page > 1 ? `<a href="${pageLink(page - 1)}">Previous runners</a> ` : ""}${hasNext ? `<a href="${pageLink(page + 1)}">More runners</a>` : ""}</nav>
      <p>Only opted-in runners are listed. Biographies, travel plans, contact details, tracking-app links, and messages are not included in this public preview.</p></main>`,
    structuredData: {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      url: `${SITE_URL}${canonicalPath}`,
      name: "Public running partners on RunBuddy",
      mainEntity: {
        "@type": "ItemList",
        itemListElement: runners.map((runner, index) => ({
          "@type": "ListItem",
          position: (page - 1) * DIRECTORY_PAGE_SIZE + index + 1,
          name: runnerName(runner),
          url: `${SITE_URL}/runner/${runner.id}`,
        })),
      },
    },
  };
}

export function unavailablePage(canonicalPath: string): PublicPage {
  return {
    title: "Runner profile unavailable | RunBuddy",
    description: "This runner profile is not available in the public directory.",
    canonicalPath,
    noindex: true,
    content: `${navigation}<main><h1>Runner profile unavailable</h1><p>This profile is not available in the public directory.</p><a href="/run-buddy">Browse public running partners</a></main>`,
  };
}

export function renderPublicPage(shell: string, page: PublicPage): string {
  // Remove homepage metadata/structured data rather than publishing conflicting tags.
  const cleaned = shell
    .replace(/<title>[\s\S]*?<\/title>/gi, "")
    .replace(/<meta\b[^>]*(?:name="(?:description|robots|twitter:[^"]+)"|property="og:[^"]+")[^>]*>/gi, "")
    .replace(/<link\b[^>]*rel="canonical"[^>]*>/gi, "")
    .replace(/<script\b[^>]*type="application\/ld\+json"[^>]*>[\s\S]*?<\/script>/gi, "");
  const canonical = escapeHtml(`${SITE_URL}${page.canonicalPath}`);
  const meta = `<title>${escapeHtml(page.title)}</title>
    <meta name="description" content="${escapeHtml(page.description)}">
    <meta name="robots" content="${page.noindex ? "noindex, nofollow" : "index, follow"}">
    <link rel="canonical" href="${canonical}">
    <meta property="og:title" content="${escapeHtml(page.title)}">
    <meta property="og:description" content="${escapeHtml(page.description)}">
    <meta property="og:url" content="${canonical}">
    <meta property="og:type" content="${page.canonicalPath.startsWith("/runner/") ? "profile" : "website"}">
    <meta property="og:site_name" content="RunBuddy">
    <meta property="og:image" content="${socialImage}">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${escapeHtml(page.title)}">
    <meta name="twitter:description" content="${escapeHtml(page.description)}">
    <meta name="twitter:image" content="${socialImage}">
    ${page.structuredData ? `<script type="application/ld+json" data-public-seo>${JSON.stringify(page.structuredData).replace(/</g, "\\u003c")}</script>` : ""}`;
  return cleaned
    .replace("</head>", `${meta}</head>`)
    .replace(/(<!-- static-public-content:start -->)[\s\S]*?(<!-- static-public-content:end -->)/, (_match, start, end) => `${start}${page.content}${end}`);
}

export function renderSitemap(ids: number[]): string {
  const routes = ["/", "/run-buddy", "/run-date", ...ids.map((id) => `/runner/${id}`)];
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${routes.map((route) => `<url><loc>${escapeHtml(`${SITE_URL}${route}`)}</loc></url>`).join("")}</urlset>`;
}
