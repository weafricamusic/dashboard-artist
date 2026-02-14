export function safeRedirectPath(value: string | null): string {
  if (!value) return "/artist/dashboard/overview";
  // Only allow same-origin relative redirects.
  if (!value.startsWith("/")) return "/artist/dashboard/overview";
  if (value.startsWith("//")) return "/artist/dashboard/overview";
  return value;
}
