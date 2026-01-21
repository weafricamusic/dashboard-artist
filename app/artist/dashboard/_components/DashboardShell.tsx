"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import type { ArtistStatus } from "../../../../lib/auth/artist";

type NavItem = {
  href: string;
  label: string;
  icon: (props: { active: boolean }) => React.ReactNode;
};

function IconShell({ children, active }: { children: React.ReactNode; active: boolean }) {
  return (
    <div
      className={
        "flex h-9 w-9 items-center justify-center rounded-xl border transition " +
        (active
          ? "border-zinc-700 bg-zinc-900 text-white"
          : "border-zinc-800 bg-zinc-950/40 text-zinc-300 group-hover:border-zinc-700 group-hover:bg-zinc-900")
      }
    >
      {children}
    </div>
  );
}

function SvgIcon({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path d={d} fill="currentColor" />
    </svg>
  );
}

function StatusBadge({ status }: { status: ArtistStatus }) {
  const cfg =
    status === "approved"
      ? { label: "Approved", cls: "border-emerald-500/30 bg-emerald-500/10 text-emerald-200" }
      : status === "pending"
        ? { label: "Pending", cls: "border-amber-500/30 bg-amber-500/10 text-amber-200" }
        : status === "premium"
          ? { label: "Premium", cls: "border-indigo-500/30 bg-indigo-500/10 text-indigo-200" }
          : { label: "Suspended", cls: "border-red-500/30 bg-red-500/10 text-red-200" };

  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-1 text-xs font-medium ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
}

function VerifiedBadge({ verified }: { verified: boolean }) {
  return (
    <span
      className={
        "inline-flex items-center rounded-full border px-2 py-1 text-xs font-medium " +
        (verified
          ? "border-sky-500/30 bg-sky-500/10 text-sky-200"
          : "border-zinc-700 bg-zinc-950/40 text-zinc-300")
      }
      title={verified ? "Verified" : "Unverified"}
    >
      {verified ? "Verified" : "Unverified"}
    </span>
  );
}

function initials(name: string): string {
  const parts = name
    .split(/\s+/)
    .map((p) => p.trim())
    .filter(Boolean);
  const first = parts[0]?.[0] ?? "A";
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] : "";
  return (first + last).toUpperCase();
}

function TopBar({
  displayName,
  status,
  verified,
  avatarUrl,
  canUploadSongs,
  canUploadVideos,
  onToggleMobile,
}: {
  displayName: string;
  status: ArtistStatus;
  verified: boolean;
  avatarUrl: string | null;
  canUploadSongs: boolean;
  canUploadVideos: boolean;
  onToggleMobile: () => void;
}) {
  const [open, setOpen] = useState(false);
  const hasAnyUpload = canUploadSongs || canUploadVideos;

  return (
    <header className="sticky top-0 z-30 border-b border-zinc-800 bg-zinc-950/70 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 md:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={onToggleMobile}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-950/40 text-zinc-200 hover:border-zinc-700 hover:bg-zinc-900 md:hidden"
            aria-label="Open navigation"
          >
            <SvgIcon d="M4 6h16v2H4V6zm0 5h16v2H4v-2zm0 5h16v2H4v-2z" />
          </button>

          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-white">{displayName}</div>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <StatusBadge status={status} />
              <VerifiedBadge verified={verified} />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-950/40 text-zinc-200 hover:border-zinc-700 hover:bg-zinc-900"
            aria-label="Notifications"
            title="Notifications"
          >
            <SvgIcon d="M12 22a2 2 0 0 0 2-2H10a2 2 0 0 0 2 2zm6-6V11a6 6 0 0 0-5-5.91V4a1 1 0 1 0-2 0v1.09A6 6 0 0 0 6 11v5l-2 2v1h16v-1l-2-2z" />
          </button>

          <div className="relative">
            <button
              type="button"
              disabled={!hasAnyUpload}
              onClick={() => setOpen((v) => !v)}
              className={
                "inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition " +
                (hasAnyUpload
                  ? "bg-white text-zinc-900 hover:bg-zinc-100"
                  : "cursor-not-allowed border border-zinc-800 bg-zinc-950/40 text-zinc-400")
              }
              title={hasAnyUpload ? "Upload" : "Uploads are locked on your plan"}
            >
              <span>Upload</span>
              <SvgIcon d="M7 10l5 5 5-5H7z" />
            </button>

            {open && hasAnyUpload ? (
              <div className="absolute right-0 mt-2 w-56 overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl">
                {canUploadSongs ? (
                  <Link
                    href="/artist/dashboard/music/new"
                    className="block px-4 py-3 text-sm text-zinc-200 hover:bg-zinc-900"
                    onClick={() => setOpen(false)}
                  >
                    Upload song
                  </Link>
                ) : null}

                {canUploadVideos ? (
                  <Link
                    href="/artist/dashboard/videos/new"
                    className="block px-4 py-3 text-sm text-zinc-200 hover:bg-zinc-900"
                    onClick={() => setOpen(false)}
                  >
                    Upload video
                  </Link>
                ) : null}
                <Link
                  href="/artist/dashboard/live"
                  className="block px-4 py-3 text-sm text-zinc-200 hover:bg-zinc-900"
                  onClick={() => setOpen(false)}
                >
                  Schedule live
                </Link>
              </div>
            ) : null}
          </div>

          <Link
            href="/artist/dashboard/profile"
            className="inline-flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-950/40 px-3 py-2 text-sm text-zinc-200 hover:border-zinc-700 hover:bg-zinc-900"
            title="Profile"
          >
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt="" className="h-7 w-7 rounded-full object-cover" />
            ) : (
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-zinc-800 text-xs font-semibold text-zinc-100">
                {initials(displayName)}
              </div>
            )}
            <span className="hidden sm:inline">{displayName.split(" ")[0]}</span>
          </Link>
        </div>
      </div>
    </header>
  );
}

export function DashboardShell({
  displayName,
  status,
  verified,
  avatarUrl,
  canUploadSongs = true,
  canUploadVideos = true,
  children,
}: {
  displayName: string;
  status: ArtistStatus;
  verified: boolean;
  avatarUrl: string | null;
  canUploadSongs?: boolean;
  canUploadVideos?: boolean;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const nav: NavItem[] = useMemo(
    () => [
      {
        href: "/artist/dashboard/overview",
        label: "Dashboard",
        icon: ({ active }) => (
          <IconShell active={active}>
            <SvgIcon d="M3 13h8V3H3v10zm10 8h8V11h-8v10zM3 21h8v-6H3v6zm10-18v6h8V3h-8z" />
          </IconShell>
        ),
      },
      {
        href: "/artist/dashboard/music",
        label: "Music",
        icon: ({ active }) => (
          <IconShell active={active}>
            <SvgIcon d="M12 3v10.55A4 4 0 1 0 14 17V7h4V3h-6z" />
          </IconShell>
        ),
      },
      {
        href: "/artist/dashboard/videos",
        label: "Videos",
        icon: ({ active }) => (
          <IconShell active={active}>
            <SvgIcon d="M17 10.5V6c0-1.1-.9-2-2-2H5C3.9 4 3 4.9 3 6v12c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2v-4.5l4 4v-11l-4 4z" />
          </IconShell>
        ),
      },
      {
        href: "/artist/dashboard/live",
        label: "Live / Events",
        icon: ({ active }) => (
          <IconShell active={active}>
            <SvgIcon d="M12 6a9 9 0 0 0-9 9h2a7 7 0 1 1 14 0h2a9 9 0 0 0-9-9zm0 4a5 5 0 0 0-5 5h2a3 3 0 1 1 6 0h2a5 5 0 0 0-5-5zm0 6a1 1 0 0 0-1 1v2h2v-2a1 1 0 0 0-1-1z" />
          </IconShell>
        ),
      },
      {
        href: "/artist/dashboard/earnings",
        label: "Earnings",
        icon: ({ active }) => (
          <IconShell active={active}>
            <SvgIcon d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm1 17.93c-2.83-.48-5-3.06-5-5.93h2c0 1.65 1.35 3 3 3s3-1.35 3-3-1.35-3-3-3c-2.76 0-5-2.24-5-5 0-2.39 1.68-4.4 4-4.9V3h2v2.1c2.32.5 4 2.51 4 4.9h-2c0-1.65-1.35-3-3-3s-3 1.35-3 3 1.35 3 3 3c2.76 0 5 2.24 5 5 0 2.87-2.17 5.45-5 5.93z" />
          </IconShell>
        ),
      },
      {
        href: "/artist/dashboard/analytics",
        label: "Analytics",
        icon: ({ active }) => (
          <IconShell active={active}>
            <SvgIcon d="M3 17h2v-7H3v7zm4 0h2V3H7v14zm4 0h2v-4h-2v4zm4 0h2V7h-2v10zm4 0h2v-9h-2v9z" />
          </IconShell>
        ),
      },
      {
        href: "/artist/dashboard/fan-engagement",
        label: "Fans",
        icon: ({ active }) => (
          <IconShell active={active}>
            <SvgIcon d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5s-3 1.34-3 3 1.34 3 3 3zM8 11c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5C15 14.17 10.33 13 8 13zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
          </IconShell>
        ),
      },
      {
        href: "/artist/dashboard/messages",
        label: "Messages",
        icon: ({ active }) => (
          <IconShell active={active}>
            <SvgIcon d="M20 4H4c-1.1 0-2 .9-2 2v12l4-4h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 8H5.17L4 13.17V6h16v6z" />
          </IconShell>
        ),
      },
      {
        href: "/artist/dashboard/promotions",
        label: "Promotions",
        icon: ({ active }) => (
          <IconShell active={active}>
            <SvgIcon d="M3 11l18-8v18l-18-8v-2zm2 2.33l12 5.33V6.34L5 11.67v1.66z" />
          </IconShell>
        ),
      },
      {
        href: "/artist/dashboard/profile",
        label: "Profile",
        icon: ({ active }) => (
          <IconShell active={active}>
            <SvgIcon d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
          </IconShell>
        ),
      },
      {
        href: "/artist/dashboard/settings",
        label: "Settings",
        icon: ({ active }) => (
          <IconShell active={active}>
            <SvgIcon d="M19.14 12.94c.04-.31.06-.63.06-.94s-.02-.63-.06-.94l2.03-1.58a.5.5 0 0 0 .12-.64l-1.92-3.32a.5.5 0 0 0-.6-.22l-2.39.96a7.007 7.007 0 0 0-1.63-.94l-.36-2.54A.5.5 0 0 0 13.9 1h-3.8a.5.5 0 0 0-.49.42l-.36 2.54c-.58.22-1.12.52-1.63.94l-2.39-.96a.5.5 0 0 0-.6.22L2.71 7.48a.5.5 0 0 0 .12.64l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94L2.83 14.52a.5.5 0 0 0-.12.64l1.92 3.32c.13.23.4.32.64.22l2.39-.96c.5.41 1.05.72 1.63.94l.36 2.54c.04.24.25.42.49.42h3.8c.24 0 .45-.18.49-.42l.36-2.54c.58-.22 1.12-.52 1.63-.94l2.39.96c.24.1.51.01.64-.22l1.92-3.32a.5.5 0 0 0-.12-.64l-2.03-1.58zM12 15.5A3.5 3.5 0 1 1 12 8a3.5 3.5 0 0 1 0 7.5z" />
          </IconShell>
        ),
      },
      {
        href: "/artist/dashboard/support",
        label: "Support",
        icon: ({ active }) => (
          <IconShell active={active}>
            <SvgIcon d="M12 2a10 10 0 0 0-10 10v3a3 3 0 0 0 3 3h1v-8H5a7 7 0 0 1 14 0h-1v8h1a3 3 0 0 0 3-3v-3A10 10 0 0 0 12 2z" />
          </IconShell>
        ),
      },
    ],
    [],
  );

  const sidebarWidth = collapsed ? "w-[76px]" : "w-72";

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="flex min-h-screen">
        {/* Desktop sidebar */}
        <aside className={`hidden flex-none border-r border-zinc-800 bg-zinc-950/60 px-3 py-4 md:block ${sidebarWidth}`}>
          <div className="flex items-center justify-between gap-2 px-2">
            <div className={"text-sm font-semibold tracking-wide " + (collapsed ? "sr-only" : "text-white")}>
              WeAfrica
            </div>
            <button
              type="button"
              onClick={() => setCollapsed((v) => !v)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-950/40 text-zinc-200 hover:border-zinc-700 hover:bg-zinc-900"
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              title={collapsed ? "Expand" : "Collapse"}
            >
              <SvgIcon d={collapsed ? "M10 6l6 6-6 6V6z" : "M14 6l-6 6 6 6V6z"} />
            </button>
          </div>

          <nav className="mt-4 flex flex-col gap-1">
            {nav.map((item) => {
              const active = pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={
                    "group flex items-center gap-3 rounded-2xl px-2 py-2 transition " +
                    (active ? "bg-zinc-900/60" : "hover:bg-zinc-900/40")
                  }
                >
                  {item.icon({ active })}
                  <div className={"min-w-0 " + (collapsed ? "sr-only" : "block")}>
                    <div className={"truncate text-sm font-medium " + (active ? "text-white" : "text-zinc-200")}>
                      {item.label}
                    </div>
                  </div>
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Mobile sidebar overlay */}
        {mobileOpen ? (
          <div className="fixed inset-0 z-40 md:hidden">
            <div
              className="absolute inset-0 bg-black/60"
              onClick={() => setMobileOpen(false)}
              aria-hidden="true"
            />
            <aside className="absolute left-0 top-0 h-full w-80 border-r border-zinc-800 bg-zinc-950 px-3 py-4 shadow-2xl">
              <div className="flex items-center justify-between px-2">
                <div className="text-sm font-semibold tracking-wide text-white">WeAfrica</div>
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-950/40 text-zinc-200 hover:border-zinc-700 hover:bg-zinc-900"
                  aria-label="Close navigation"
                >
                  <SvgIcon d="M18.3 5.71L12 12l6.3 6.29-1.41 1.42L10.59 13.4 4.29 19.71 2.88 18.29 9.17 12 2.88 5.71 4.29 4.29 10.59 10.6l6.3-6.31 1.41 1.42z" />
                </button>
              </div>

              <nav className="mt-4 flex flex-col gap-1">
                {nav.map((item) => {
                  const active = pathname === item.href || pathname.startsWith(item.href + "/");
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className={
                        "group flex items-center gap-3 rounded-2xl px-2 py-2 transition " +
                        (active ? "bg-zinc-900/60" : "hover:bg-zinc-900/40")
                      }
                    >
                      {item.icon({ active })}
                      <div className="min-w-0">
                        <div className={"truncate text-sm font-medium " + (active ? "text-white" : "text-zinc-200")}>
                          {item.label}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </nav>
            </aside>
          </div>
        ) : null}

        <div className="flex min-w-0 flex-1 flex-col">
          <TopBar
            key={pathname}
            displayName={displayName}
            status={status}
            verified={verified}
            avatarUrl={avatarUrl}
            canUploadSongs={canUploadSongs}
            canUploadVideos={canUploadVideos}
            onToggleMobile={() => setMobileOpen(true)}
          />

          <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 md:px-6">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
