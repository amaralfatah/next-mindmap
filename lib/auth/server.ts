import { createNeonAuth } from "@neondatabase/auth/next/server";

/**
 * Neon Auth server instance backed by Managed Better Auth.
 */
export const auth = createNeonAuth({
  baseUrl: process.env.NEON_AUTH_BASE_URL!,
  cookies: {
    secret: process.env.NEON_AUTH_COOKIE_SECRET!,
    sessionDataTtl: 300,
  },
});
