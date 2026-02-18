-- Legal documents (Terms, Platform Policy, Copyright) + acceptance tracking
-- Safe to run multiple times.

create extension if not exists pgcrypto;

create table if not exists public.legal_documents (
  slug text primary key,
  title text not null,
  version int not null default 1,
  content text not null default '',
  updated_at timestamptz not null default now()
);

create table if not exists public.legal_acceptance (
  id uuid primary key default gen_random_uuid(),
  artist_uid text not null,

  accepted_terms_version int not null,
  accepted_platform_policy_version int not null,
  accepted_copyright_policy_version int not null,

  accepted_at timestamptz not null default now(),
  ip_address text null,
  user_agent text null,

  constraint legal_acceptance_one_row_per_artist unique (artist_uid)
);

alter table public.legal_documents enable row level security;
alter table public.legal_acceptance enable row level security;

-- Seed baseline documents (admin can edit later).
insert into public.legal_documents (slug, title, version, content)
values
  (
    'terms',
    'WeAfrica Music – Artist Terms of Service',
    1,
    'WeAfrica Music – Artist Terms of Service\n\nLast updated: 2026-02-16\n\n1. Acceptance of Terms\nBy creating an artist account and uploading content on WeAfrica Music, you agree to be legally bound by these Terms of Service. If you do not agree, do not use the platform.\n\n2. Eligibility\nYou must be at least 18 years old, or have parental/legal guardian consent. You agree to provide accurate personal and payment information and to keep it up to date.\n\n3. Artist Responsibilities\nAs an artist, you agree that:\n- You own or control the necessary rights to the content you upload, and you have permission to distribute it.\n- Your content does not infringe copyright, trademark, privacy, or other rights.\n- Your content does not contain illegal material and does not promote hate, violence, terrorism, or abuse.\n- You will not manipulate plays/streams, use bots, or engage in fraudulent activity.\n\n4. Content Ownership & License\nArtists retain ownership of their music, videos, artwork, and related content.\n\nBy uploading content, you grant WeAfrica Music a non-exclusive, worldwide, royalty-free license to host, stream, reproduce (as necessary for technical delivery), promote, and distribute your content on the platform and in marketing for the platform.\n\nThis license ends for a piece of content when you remove it from the platform, except to the extent copies are required for legal compliance, backups, dispute resolution, or to complete ongoing transactions.\n\n5. Monetization & Earnings\nArtists may earn through coins, ads, subscriptions, live battles, and other monetization features offered by WeAfrica Music.\n\nWeAfrica Music may deduct platform fees, payment processing charges, refunds/chargebacks, and taxes/withholding where applicable.\n\nCurrency conversion disclaimer: payouts may involve currency conversion (including MWK and other currencies). Exchange rates and fees may vary and are not guaranteed by WeAfrica Music.\n\nTax responsibility: you are responsible for your own tax obligations related to your earnings unless required by law for WeAfrica Music or its payment partners to withhold or report amounts.\n\n6. Account Suspension / Termination\nWeAfrica Music may suspend or terminate accounts and/or remove content if copyright violations occur, fraudulent activity is detected, the platform is abused, or these Terms or platform policies are violated.\n\n7. Changes to Terms\nWeAfrica Music may update these Terms at any time. Continued use of the platform after updates constitutes acceptance of the updated Terms.'
  ),
  (
    'platform-policy',
    'WeAfrica Music Content & Community Policy',
    1,
    'WeAfrica Music Content & Community Policy\n\nLast updated: 2026-02-16\n\nThis policy applies to uploaded content (songs, videos, artwork, descriptions) and live streaming (including live battles).\n\n1. Prohibited Content\nArtists may NOT upload or stream content that includes:\n- Copyrighted music/videos you do not own or have permission to distribute\n- Pornographic or sexually explicit content\n- Extreme violence or graphic harm\n- Hate speech, harassment, or targeted abuse\n- Political extremism or terrorist propaganda\n- Scams, fraud, or misleading content\n- Illegal content (including content that facilitates illegal activity)\n\n2. Sensitive Content\nSome sensitive content may be allowed with restrictions, including mild profanity, emotional themes, breakup songs, and diss tracks that do not include threats or targeted harassment. WeAfrica Music may limit distribution, remove, or age-restrict content at its discretion.\n\n3. Live Streaming & Live Battle Rules\nDuring live streaming, you must not:\n- Show nudity or sexually explicit content\n- Harass, threaten, or abuse others\n- Encourage violence or self-harm\n- Engage in fake gifting, ranking manipulation, or coordinated fraud\n\nViolations may result in live suspension, monetization removal, account restrictions, or permanent bans.\n\n4. Fake Streams & Fraud\nWeAfrica Music strictly prohibits buying fake streams, using bots, artificial boosting, or any manipulation of platform metrics. Accounts caught may be permanently banned and earnings forfeited where allowed by law.\n\n5. Enforcement\nWeAfrica Music may remove content, restrict features, limit distribution, or suspend accounts based on enforcement needs. Repeated violations may result in permanent removal from the platform.'
  ),
  (
    'copyright',
    'WeAfrica Music Copyright & Takedown Policy',
    1,
    'WeAfrica Music Copyright & Takedown Policy\n\nLast updated: 2026-02-16\n\nWeAfrica Music is a hosting platform for user-uploaded content and does not claim ownership of artists\u2019 uploaded content.\n\n1. Copyright Ownership\nArtists must only upload content they:\n- Created themselves, or\n- Have written permission to distribute, or\n- Have purchased/licensed appropriate rights to distribute\n\n2. Reporting Copyright Infringement\nIf you believe your copyright is being infringed, submit a notice with:\n- Full legal name\n- Contact information\n- Link to the original copyrighted work\n- Link to the allegedly infringing content on WeAfrica Music\n- Statement of good faith belief that use is not authorized\n- Statement that the information is accurate\n- Digital signature\n\nEmail: copyright@weafricamusic.com\n\n3. Takedown Process\nUpon receiving a valid complaint, WeAfrica Music may remove or disable access to the content and notify the uploader. The uploader may submit a counter-notice where applicable.\n\n4. Counter-Notice\nA counter-notice should include:\n- Full legal name\n- Contact information\n- Identification of the removed content\n- Statement under penalty of perjury that removal was a mistake or misidentification\n- Consent to applicable jurisdiction where required\n- Digital signature\n\n5. Repeat Infringer Policy\nArtists with repeated copyright violations may lose monetization, have their account suspended, or be permanently banned.'
  )
on conflict (slug) do nothing;
