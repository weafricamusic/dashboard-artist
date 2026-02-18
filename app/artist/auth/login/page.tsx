import { redirect } from "next/navigation";

export default function ArtistLoginPage() {
  // Login should only happen in the consumer app. Send users to homepage.
  redirect("/");
}
