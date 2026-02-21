"use server";

import { auth } from "@/auth";
import { prisma } from "@/src/lib/prisma";

export const fetchAccount = async (
  userId?: string,
  provider?: string,
) => {
  try {
    if (!userId) {
      // If no userId provided, get from session
      const session = await auth();
      userId = session?.user?.id;
    }

    if (!userId) {
      console.log("⚠️  No user ID found");
      return null;
    }

    // Use Prisma instead of TypeORM - much simpler!
    const account = await prisma.account.findFirst({
      where: {
        userId: userId,
        ...(provider ? { provider } : {}),
      },
    });

    if (!account) {
      console.log("⚠️  No account found in database");
      return null;
    }

    return {
      userId: account.userId,
      provider: account.provider,
      accessToken: account.access_token,
      expiresAt: account.expires_at,
      refreshToken: account.refresh_token,
      scope: account.scope,
      tokenType: account.token_type,
    };
  } catch (error) {
    console.error("❌ DB Fetch Error:", error);
    console.error("Error details:", {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : null,
    });
    return null;
  }
};

export const fetchAccounts = async (userId?: string) => {
  try {
    if (!userId) {
      const session = await auth();
      userId = session?.user?.id;
    }

    if (!userId) {
      console.log("⚠️  No user ID found");
      return [];
    }

    const accounts = await prisma.account.findMany({
      where: { userId },
    });

    return accounts.map((account) => ({
      userId: account.userId,
      provider: account.provider,
      accessToken: account.access_token,
      expiresAt: account.expires_at,
      refreshToken: account.refresh_token,
      scope: account.scope,
      tokenType: account.token_type,
    }));
  } catch (error) {
    console.error("❌ DB Fetch Error:", error);
    return [];
  }
};
