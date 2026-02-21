import NextAuth, { DefaultSession } from "next-auth";

declare module "next-auth" {
  /**
   * The shape of the user object within the session
   */
  interface User {
    // Add any custom user fields here if needed
  }

  /**
   * Extends the built-in session types
   */
  interface Session {
    accessToken?: string;
    refreshToken?: string; // 👈 This fixes your error
    scope?: string;
    user: {
      id: string;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  /**
   * Extends the built-in JWT types
   */
  interface JWT {
    accessToken?: string;
    refreshToken?: string;
    expiresAt?: number;
  }
}
