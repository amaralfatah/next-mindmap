import { auth } from "@/lib/auth/server";

// Returning from Google, Neon Auth adds a one-time verifier to the URL. Exchanging it here, before
// the page renders, sets the session cookie so `/` can send the user straight to `/maps`.
// The matcher only lets verifier requests through; a failed exchange falls back to `/maps`, which
// sends a signed-out visitor back to `/`.
export default auth.middleware({ loginUrl: "/maps" });

export const config = {
  matcher: [
    {
      source: "/((?!api|_next/static|_next/image).*)",
      has: [{ type: "query", key: "neon_auth_session_verifier" }],
    },
  ],
};
