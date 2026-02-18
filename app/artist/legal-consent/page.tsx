import { requireArtistSession } from "../../../lib/auth/artist";

import { LegalConsentClient } from "./LegalConsentClient";

export default async function ArtistLegalConsentPage() {
  await requireArtistSession();

  return (
    <div className="mx-auto max-w-3xl space-y-4 px-4 py-10">
      <h1 className="text-2xl font-semibold text-white">Agree to Legal Documents</h1>
      <p className="text-sm text-zinc-300">
        This is required before you can access the Artist Dashboard.
      </p>
      <LegalConsentClient />
    </div>
  );
}
