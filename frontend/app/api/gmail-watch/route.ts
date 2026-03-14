import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { startGmailWatch } from "@/app/util/gmailPush";
import { prisma } from "@/src/lib/prisma";

export async function POST() {
  const session = await auth();

  const userId = await prisma.account.findFirst({
    where: { isActive: true, provider: "google" },
    select: { userId: true },
  });

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const data = await startGmailWatch(userId.userId);
    console.log("GMAIL WATCH DATA", data);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
