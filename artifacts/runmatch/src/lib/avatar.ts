export function resolveAvatarUrl(avatarUrl?: string | null): string | undefined {
  if (!avatarUrl) return undefined;
  if (/^(https?:|data:|blob:)/i.test(avatarUrl)) return avatarUrl;
  return new URL(
    avatarUrl.startsWith("/") ? avatarUrl : `/${avatarUrl}`,
    window.location.origin,
  ).toString();
}