export function normalizeArtifactBasePath(basePath: string): string {
  const normalized = basePath.replace(/\/+$/, "");
  return normalized === "/" ? "" : normalized;
}

export function getArtifactRoutePath(
  basePath: string,
  route: string,
): string {
  const base = normalizeArtifactBasePath(basePath);
  const path = route.replace(/^\/+/, "");
  return `${base}/${path}`;
}

export function getArtifactRootPath(basePath: string): string {
  return normalizeArtifactBasePath(basePath) || "/";
}