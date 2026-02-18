import Link from "next/link";

const nav = [
  { href: "/artist/dashboard/overview", label: "Overview" },
  { href: "/artist/dashboard/ai", label: "AI Manager" },
  { href: "/artist/dashboard/uploads", label: "My Uploads" },
  { href: "/artist/dashboard/profile", label: "Profile" },
  { href: "/artist/dashboard/music", label: "Songs" },
  { href: "/artist/dashboard/playlists", label: "Albums / Playlists" },
  { href: "/artist/dashboard/videos", label: "Videos" },
  { href: "/artist/dashboard/live", label: "Live" },
  { href: "/artist/dashboard/battles", label: "Battles" },
  { href: "/artist/dashboard/earnings", label: "Earnings" },
  { href: "/artist/dashboard/promotions", label: "Promotions" },
  { href: "/artist/dashboard/analytics", label: "Analytics" },
  { href: "/artist/dashboard/fan-engagement", label: "Fan Engagement" },
  { href: "/artist/dashboard/support", label: "Support" },
  { href: "/artist/dashboard/settings", label: "Settings" },
];

export function Sidebar() {
  return (
    <aside className="hidden w-64 flex-none border-r border-zinc-800 bg-zinc-950/40 p-4 md:block">
      <div className="text-sm font-semibold text-white">WeAfrica Artist</div>
      <nav className="mt-4 flex flex-col gap-1">
        {nav.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="rounded-lg px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-900 hover:text-white"
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
