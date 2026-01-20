"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";

import { saveDashboardSettingsWithState } from "./actions";
import type { ArtistDashboardSettings, DashboardLanguage, ThemePreference } from "../../../../lib/settings/artist";

function classNames(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

function SwitchRow({
  name,
  label,
  description,
  defaultChecked,
}: {
  name: string;
  label: string;
  description: string;
  defaultChecked: boolean;
}) {
  return (
    <label className="flex items-start justify-between gap-4 rounded-xl border border-white/10 bg-black/20 px-4 py-3">
      <div className="min-w-0">
        <div className="text-sm font-medium text-white">{label}</div>
        <div className="mt-1 text-xs text-zinc-400">{description}</div>
      </div>

      <span className="relative mt-1 inline-flex shrink-0 items-center">
        <input name={name} type="checkbox" defaultChecked={defaultChecked} className="peer sr-only" />
        <span
          className={
            "h-6 w-11 rounded-full border border-white/10 bg-white/10 transition peer-checked:border-violet-500/50 peer-checked:bg-violet-600"
          }
        />
        <span
          className={
            "pointer-events-none absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition peer-checked:translate-x-5"
          }
        />
      </span>
    </label>
  );
}

function SelectRow({
  name,
  label,
  description,
  defaultValue,
  children,
}: {
  name: string;
  label: string;
  description: string;
  defaultValue: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block rounded-xl border border-white/10 bg-black/20 px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-medium text-white">{label}</div>
          <div className="mt-1 text-xs text-zinc-400">{description}</div>
        </div>
        <select
          name={name}
          defaultValue={defaultValue}
          className="mt-1 rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-violet-500/60"
        >
          {children}
        </select>
      </div>
    </label>
  );
}

function Card({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-white/10 bg-zinc-950/40 p-5 shadow-sm">
      <div>
        <h2 className="text-sm font-semibold text-white">{title}</h2>
        {description ? <p className="mt-1 text-sm text-zinc-400">{description}</p> : null}
      </div>
      <div className="mt-4 space-y-3">{children}</div>
    </section>
  );
}

function applyTheme(theme: ThemePreference) {
  const root = document.documentElement;
  root.classList.remove("theme-dark", "theme-light");
  root.classList.add(theme === "light" ? "theme-light" : "theme-dark");
}

function languageLabel(lang: DashboardLanguage): string {
  if (lang === "ny") return "Chichewa";
  if (lang === "bem") return "Bemba";
  return "English";
}

export default function SettingsClient({
  settings,
  appVersion,
}: {
  settings: ArtistDashboardSettings;
  appVersion: string;
}) {
  const router = useRouter();

  const formRef = React.useRef<HTMLFormElement | null>(null);
  const saveTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const [status, action, pending] = React.useActionState(saveDashboardSettingsWithState, { ok: true } as {
    ok: boolean;
    message?: string;
  });

  const [toast, setToast] = React.useState<string | null>(null);
  const [languagePreview, setLanguagePreview] = React.useState<DashboardLanguage>(settings.language);
  const [themePreview, setThemePreview] = React.useState<ThemePreference>(settings.appearance.theme ?? "dark");

  const scheduleSave = React.useCallback(() => {
    if (!formRef.current) return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      formRef.current?.requestSubmit();
    }, 350);
  }, []);

  React.useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, []);

  React.useEffect(() => {
    if (!pending && status.ok) {
      setToast("Saved");
      const t = setTimeout(() => setToast(null), 1200);
      return () => clearTimeout(t);
    }

    if (!pending && !status.ok) {
      setToast(status.message ?? "Could not save");
      const t = setTimeout(() => setToast(null), 2500);
      return () => clearTimeout(t);
    }
  }, [pending, status.ok, status.message]);

  // Ensure theme is applied immediately on settings page.
  React.useEffect(() => {
    const current = settings.appearance.theme ?? "dark";
    try {
      localStorage.setItem("weafrica_theme", current);
    } catch {
      // ignore
    }
    applyTheme(current);
    setThemePreview(current);
  }, [settings.appearance.theme]);

  async function confirmLogout() {
    const ok = window.confirm("Are you sure you want to log out?");
    if (!ok) return;
    await fetch("/auth/logout", { method: "POST" });
    router.replace("/artist/auth/login");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white">Settings</h1>
          <p className="mt-1 text-sm text-zinc-400">Simple controls. No clutter.</p>
        </div>
        <div className="flex items-center gap-2">
          {toast ? (
            <div className="rounded-full border border-white/10 bg-black/30 px-3 py-1 text-xs text-zinc-200">
              {toast}
            </div>
          ) : null}
          {pending ? (
            <div className="rounded-full border border-white/10 bg-black/30 px-3 py-1 text-xs text-zinc-200">
              Saving…
            </div>
          ) : null}
        </div>
      </div>

      <form
        ref={formRef}
        action={action}
        className="space-y-6"
        onChange={(e) => {
          const target = e.target as HTMLElement | null;
          if (!target) return;

          // Appearance: apply instantly for a live preview.
          if (target instanceof HTMLInputElement && target.name === "appearance.theme") {
            const theme = (target.value === "light" ? "light" : "dark") as ThemePreference;
            try {
              localStorage.setItem("weafrica_theme", theme);
            } catch {
              // ignore
            }
            applyTheme(theme);
            setThemePreview(theme);
          }

          if (target instanceof HTMLSelectElement && target.name === "language") {
            const lang = (target.value === "ny" ? "ny" : target.value === "bem" ? "bem" : "en") as DashboardLanguage;
            setLanguagePreview(lang);
          }

          scheduleSave();
        }}
      >
        <Card title="Notifications" description="Choose how you want to be notified.">
          <SwitchRow
            name="notifications.push"
            label="Push Notifications"
            description="Get alerts on your phone when something important happens."
            defaultChecked={settings.notifications.push}
          />
          <SwitchRow
            name="notifications.email"
            label="Email Notifications"
            description="Get updates sent to your email address."
            defaultChecked={settings.notifications.email}
          />
          <SwitchRow
            name="notifications.newMessages"
            label="New Messages"
            description="Alert me when someone sends a message."
            defaultChecked={settings.notifications.newMessages}
          />
          <SwitchRow
            name="notifications.commentsAndLikes"
            label="New Comments & Likes"
            description="Let me know when fans react to my songs or videos."
            defaultChecked={settings.notifications.commentsAndLikes}
          />
          <SwitchRow
            name="notifications.earningsAndPayouts"
            label="Earnings & Payout Updates"
            description="Updates when coins arrive or a payout changes status."
            defaultChecked={settings.notifications.earningsAndPayouts}
          />
          <SwitchRow
            name="notifications.liveEventAlerts"
            label="Live Event Alerts"
            description="Reminders and updates about upcoming live events."
            defaultChecked={settings.notifications.liveEventAlerts}
          />
          <SwitchRow
            name="notifications.announcements"
            label="Platform Announcements"
            description="Important news and updates from the platform."
            defaultChecked={settings.notifications.announcements}
          />
        </Card>

        <Card title="Privacy" description="Control what people can see and how they can reach you.">
          <SelectRow
            name="privacy.profileVisibility"
            label="Profile Visibility"
            description="Choose who can see your profile."
            defaultValue={settings.privacy.profileVisibility}
          >
            <option value="public">Public</option>
            <option value="followers">Followers only</option>
          </SelectRow>

          <SelectRow
            name="privacy.whoCanMessageMe"
            label="Who can message me"
            description="Choose who can start a conversation with you."
            defaultValue={settings.privacy.whoCanMessageMe}
          >
            <option value="everyone">Everyone</option>
            <option value="followers">Followers only</option>
          </SelectRow>

          <SwitchRow
            name="privacy.showStatisticsToFans"
            label="Show statistics to fans"
            description="If off, fans won’t see your numbers."
            defaultChecked={settings.privacy.showStatisticsToFans}
          />

          <SwitchRow
            name="privacy.dataConsent"
            label="Data usage & consent"
            description="Allow the app to use your activity data to improve recommendations."
            defaultChecked={settings.privacy.dataConsent}
          />

          <div className="rounded-xl border border-white/10 bg-black/20 px-4 py-3">
            <div className="text-sm font-medium text-white">Your data</div>
            <div className="mt-1 text-xs text-zinc-400">
              You can request a copy of your data anytime. This helps you stay in control.
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-zinc-100 opacity-60"
                disabled
              >
                Manage consent (soon)
              </button>
              <button
                type="button"
                className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-zinc-100 opacity-60"
                disabled
              >
                Download data (soon)
              </button>
            </div>
          </div>
        </Card>

        <Card title="Language" description="Choose the language you want to see.">
          <SelectRow
            name="language"
            label="App language"
            description="You can change this anytime."
            defaultValue={settings.language}
          >
            <option value="en">English</option>
            <option value="ny">Chichewa</option>
            <option value="bem">Bemba</option>
          </SelectRow>

          <div className="rounded-xl border border-white/10 bg-black/20 px-4 py-3">
            <div className="text-sm font-medium text-white">Preview</div>
            <div className="mt-1 text-xs text-zinc-400">
              Selected: {languageLabel(languagePreview)}
            </div>
          </div>
        </Card>

        <Card title="Appearance" description="Choose how the dashboard looks.">
          <div className="rounded-xl border border-white/10 bg-black/20 px-4 py-3">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-sm font-medium text-white">Theme</div>
                <div className="mt-1 text-xs text-zinc-400">Dark mode is the default.</div>
              </div>

              <div className="flex items-center gap-2">
                <label className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-zinc-100">
                  <input
                    type="radio"
                    name="appearance.theme"
                    value="dark"
                    defaultChecked={settings.appearance.theme === "dark"}
                  />
                  <span>Dark</span>
                </label>
                <label className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-zinc-100">
                  <input
                    type="radio"
                    name="appearance.theme"
                    value="light"
                    defaultChecked={settings.appearance.theme === "light"}
                  />
                  <span>Light</span>
                </label>
              </div>
            </div>
            <div className="mt-3 text-xs text-zinc-400">Now previewing: {themePreview === "light" ? "Light" : "Dark"}</div>
          </div>
        </Card>

        <Card title="Legal & Info" description="Quick links and app information.">
          <div className="grid gap-2 sm:grid-cols-2">
            <Link className="rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-zinc-100 hover:bg-white/5" href="/legal/terms">
              Terms of Service
            </Link>
            <Link className="rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-zinc-100 hover:bg-white/5" href="/legal/privacy">
              Privacy Policy
            </Link>
            <Link className="rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-zinc-100 hover:bg-white/5" href="/legal/copyright">
              Copyright Policy
            </Link>
            <div className="rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-zinc-300">
              App version: <span className="font-mono">{appVersion}</span>
            </div>
          </div>
        </Card>

        <div className="rounded-2xl border border-white/10 bg-zinc-950/40 p-5 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-sm font-semibold text-white">Account</h2>
              <p className="mt-1 text-sm text-zinc-400">Account-level actions.</p>
            </div>
          </div>

          <div className="mt-4">
            <button
              type="button"
              onClick={confirmLogout}
              className={classNames(
                "w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-left text-sm font-medium text-zinc-100",
                "transition hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-200",
              )}
            >
              Log out
              <div className="mt-1 text-xs font-normal text-zinc-400">
                You’ll be signed out on this device.
              </div>
            </button>

            <details className="mt-4 rounded-xl border border-white/10 bg-black/20 px-4 py-3">
              <summary className="cursor-pointer text-sm font-medium text-zinc-100">Advanced</summary>
              <div className="mt-3 grid gap-2">
                <button
                  type="button"
                  className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-zinc-100 opacity-60"
                  disabled
                >
                  Change password (soon)
                </button>
                <button
                  type="button"
                  className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-zinc-100 opacity-60"
                  disabled
                >
                  Deactivate account (soon)
                </button>
                <button
                  type="button"
                  className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-200 opacity-60"
                  disabled
                >
                  Delete account (soon)
                </button>
              </div>
            </details>
          </div>
        </div>
      </form>
    </div>
  );
}
