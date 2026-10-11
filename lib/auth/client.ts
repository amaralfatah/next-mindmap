import { createAuthClient } from "@neondatabase/auth/next";

/**
 * Neon Auth client for React components.
 * Automatically communicates with `/api/auth` on the same origin.
 */
export const authClient = createAuthClient();

export const { useSession, signIn, signUp, signOut } = authClient;
