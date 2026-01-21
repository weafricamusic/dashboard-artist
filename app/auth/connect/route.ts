import { NextResponse, type NextRequest } from "next/server";

import { safeRedirectPath } from "../../../lib/auth/redirect";
import {
  getArtistDashboardBaseUrl,
  getConsumerAppConnectUrl,
} from "../../../lib/urls";

function wantsJson(request: NextRequest): boolean {
  const accept = request.headers.get("accept") ?? "";
  return accept.includes("application/json");
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);

  const consumerConnectUrl = getConsumerAppConnectUrl();
  if (!consumerConnectUrl) {
    if (wantsJson(request)) {
      return NextResponse.json(
        {
          error:
            "Consumer app connect URL is not configured. Set CONSUMER_APP_CONNECT_URL.",
        },
        { status: 500, headers: { "cache-control": "no-store" } },
      );
    }

    const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Logged In Successfully</title>
  </head>
  <body style="font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; padding: 24px;">
    <div style="max-width: 520px; margin: 0 auto;">
      <h1 style="margin: 0 0 12px;">Logged In Successfully</h1>
      <p style="margin: 0 0 10px; line-height: 1.4;">Your account is active.</p>
      <p style="margin: 0; line-height: 1.4;">
        To upload music, go live, and manage your profile, please use the WeAfrica Music mobile app.
      </p>
    </div>
  </body>
</html>`;

    return new NextResponse(html, {
      status: 200,
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "no-store",
      },
    });
  }

  const redirectPath = safeRedirectPath(url.searchParams.get("redirect"));

  const dashboardBaseUrl = getArtistDashboardBaseUrl() ?? url.origin;

  // This is where the Flutter app should send the user back to after login,
  // appending `token=<FirebaseIDToken>`.
  const consumeUrl = new URL("/auth/consume", dashboardBaseUrl);
  consumeUrl.searchParams.set("redirect", redirectPath);

  const destination = new URL(consumerConnectUrl);
  destination.searchParams.set("returnTo", consumeUrl.toString());

  const mode = url.searchParams.get("mode");
  if (mode === "login" || mode === "signup") {
    destination.searchParams.set("mode", mode);
  }

  const response = NextResponse.redirect(destination);
  response.headers.set("cache-control", "no-store");
  return response;
}
