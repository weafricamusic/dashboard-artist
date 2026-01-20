export function safeRedirectPath(value: string | null): string {
  if (!value) return "/";
  // Only allow same-origin relative redirects.
  if (!value.startsWith("/")) return "/";
  if (value.startsWith("//")) return "/";
  return value;
}
