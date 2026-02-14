import { redirect } from "next/navigation";

type SearchParams = Record<string, string | string[] | undefined>;

export default function ArtistLoginPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  // Login should only happen in the consumer app. Send users to homepage.
  void searchParams;
  redirect("/");
}
