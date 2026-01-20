import pkg from "../../../../package.json";

import { requireArtistSession } from "../../../../lib/auth/artist";
import { getArtistDashboardSettings } from "../../../../lib/settings/artist";
import SettingsClient from "./SettingsClient";

export default async function ArtistSettingsPage() {
  const session = await requireArtistSession();
  const { settings } = await getArtistDashboardSettings(session.user.uid);

  return <SettingsClient settings={settings} appVersion={pkg.version} />;
}
