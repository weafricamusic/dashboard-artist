export type SupabaseLikeError = {
  message?: string;
  code?: string;
  details?: string;
  hint?: string;
};

// PostgREST returns PGRST205 when a relation/table/view is not found in the schema cache.
// Supabase JS surfaces this as `error.code` and a message like:
// "Could not find the table 'public.uploads' in the schema cache"
export function isMissingTableError(
  error: SupabaseLikeError | null | undefined,
  table: string,
): boolean {
  if (!error) return false;

  const msg = String(error.message ?? "");
  const normalized = msg.toLowerCase();
  const tableNeedle = table.toLowerCase();

  return (
    error.code === "PGRST205" ||
    normalized.includes("schema cache") ||
    normalized.includes("could not find the table")
  ) && (normalized.includes(`.${tableNeedle}`) || normalized.includes(tableNeedle));
}

export function missingTableFixMessage(input: {
  table: string;
  migrationPath?: string;
}): string {
  const suffix = input.migrationPath
    ? ` Run the SQL migration at ${input.migrationPath} in your Supabase project's SQL editor (or apply it via the Supabase CLI), then reload the API schema cache and retry.`
    : " Create the table in your Supabase database, reload the API schema cache, and retry.";

  return `Missing database table: public.${input.table}.${suffix}`;
}
