import { NextResponse, type NextRequest } from "next/server";

import { safeRedirectPath } from "../../../lib/auth/redirect";
import {
  getArtistDashboardBaseUrl,
  getConsumerAppConnectUrl,
} from "../../../lib/urls";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);

  const consumerConnectUrl = getConsumerAppConnectUrl();
  if (!consumerConnectUrl) {
    const accept = request.headers.get("accept") ?? "";
    const wantsJson = accept.includes("application/json");

    if (wantsJson) {
      return NextResponse.json(
        {
          error:
            "Consumer app connect URL is not configured. Set CONSUMER_APP_CONNECT_URL.",
        },
        { status: 500, headers: { "cache-control": "no-store" } },
      );
    }

    // Browser UX fallback: if the consumer connect bridge isn't configured,
    // send the user to the dashboard login page instead of showing a 500.
    const redirectPath = safeRedirectPath(url.searchParams.get("redirect"));
    const fallback = new URL("/artist/auth/login", url);
    fallback.searchParams.set("redirect", redirectPath);
    fallback.searchParams.set("error", "consumer_connect_not_configured");

    const response = NextResponse.redirect(fallback);
    response.headers.set("cache-control", "no-store");
    return response;
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
