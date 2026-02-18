import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "WeAfrica Artist",
};

export default function ArtistLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="min-h-screen bg-zinc-950 text-zinc-100">{children}</div>;
}
