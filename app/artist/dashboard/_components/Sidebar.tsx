import Link from "next/link";

const nav = [
  { href: "/artist/dashboard/overview", label: "Overview" },
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
    <aside className="hidden w-64 flex-none border-r border-zinc-200 bg-white p-4 md:block">
      <div className="text-sm font-semibold">WeAfrica Artist</div>
      <nav className="mt-4 flex flex-col gap-1">
        {nav.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="rounded-lg px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900"
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
