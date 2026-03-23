import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export type AppSession = {
  user: {
    id: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
  expires: string;
};

/**
 * Typed wrapper around getServerSession.
 * next-auth's conditional return-type inference doesn't play well with
 * authOptions typed as the broad NextAuthOptions, so we assert here once.
 */
export async function getAppSession(): Promise<AppSession | null> {
  return getServerSession(authOptions) as unknown as AppSession | null;
}
