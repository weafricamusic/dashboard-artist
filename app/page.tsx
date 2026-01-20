import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-6">
      <main className="w-full max-w-2xl rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold">WeAfrica Dashboards</h1>
        <p className="mt-2 text-sm text-zinc-600">
          Entry points for the web dashboards.
        </p>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <Link
            href="/artist/dashboard"
            className="rounded-xl border border-zinc-200 p-4 hover:bg-zinc-50"
          >
            <div className="text-sm font-semibold">Artist Dashboard</div>
            <div className="mt-1 text-sm text-zinc-600">/artist/dashboard</div>
          </Link>

          <Link
            href="/artist/auth/login"
            className="rounded-xl border border-zinc-200 p-4 hover:bg-zinc-50"
          >
            <div className="text-sm font-semibold">Artist Login</div>
            <div className="mt-1 text-sm text-zinc-600">/artist/auth/login</div>
          </Link>
        </div>
      </main>
    </div>
  );
}
