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
    <title>Login Unavailable</title>
  </head>
  <body style="font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; padding: 24px;">
    <h1 style="margin: 0 0 12px;">Login is handled in the consumer app</h1>
    <p style="margin: 0 0 12px; line-height: 1.4;">
      This dashboard is configured to use the consumer app for authentication.
      The server is missing <code>CONSUMER_APP_CONNECT_URL</code>, so it can’t redirect you to the consumer login.
    </p>
    <p style="margin: 0; line-height: 1.4;">
      Ask an admin to set <code>CONSUMER_APP_CONNECT_URL</code> in Vercel Environment Variables.
    </p>
  </body>
</html>`;

    return new NextResponse(html, {
      status: 500,
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
