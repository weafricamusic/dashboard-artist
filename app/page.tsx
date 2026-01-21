import { redirect } from "next/navigation";

export default function Home() {
  redirect("/artist/dashboard");
}
