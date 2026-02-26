import { handleGmailPush } from "@/app/util/gmailPush";
import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { auth } from "@/auth";
import { classifyEmailNode } from "@/src/lib/agent/modelNodes";
import { fetchUnreadEmails } from "@/app/util/fetchUnreadEmails/fetchUnreadEmails";
import { embeddingsModel } from "@/app/models/embeddingsModel/embeddingsModel";

type History = {
  userId: string;
  startHistoryId: string;
  maxResults: number;
  pageToken?: string;
  historyTypes: string[];
};

export async function POST(req: Request) {
  const body = await req.json();
  const result = await handleGmailPush(body);
  const payload = result.payload ?? {};
  console.log("Gmail push payload", payload.historyId);

  const session = await auth();

  if (!result.ok) {
    console.error("Invalid Pub/Sub payload", result.error);
    return NextResponse.json({ ok: true, ignored: true }, { status: 200 });
  }
  console.log("Pub/Sub push received");

  const emailAddress = payload?.emailAddress;
  console.log("Email address", emailAddress);
  if (!emailAddress) {
    return NextResponse.json({ success: true, ...result });
  }

  const account = await prisma.account.findFirst({
    where: {
      provider: "google",
      userId: session?.user.id,
    },
  });

  if (!account) {
    return NextResponse.json({
      success: true,
      ...result,
      account: "not_found",
    });
  }

  const emails = await fetchUnreadEmails(account, payload.historyId);

  const state = {
    currentEmails: emails, // normalized email object
    messages: [], // if node expects this
  };

  const classifiedEmails = await classifyEmailNode(state);
  const { emailsToStore } = classifiedEmails;
  console.log("Classify output", classifiedEmails);

  if (classifiedEmails.shouldStore) {
    const emailDataToStore = await Promise.all(
      emailsToStore.map(async (email) => {
        const embeddingResp = await embeddingsModel({ body: email.body || "" });
        return {
          messageId: email.id,
          userId: session?.user.id,
          accountId: account.id,
          provider: "google",
          threadId: email.threadId,
          from: email.from,
          subject: email.subject,
          body: email.body || "",
          embedding: embeddingResp.data?.[0]?.embedding ?? [],
        };
      }),
    );
    for (const email of emailDataToStore) {
      const embeddingVector = `[${email.embedding.join(",")}]`;
      await prisma.$executeRawUnsafe(
        `
        INSERT INTO "MessageEmbedding"
          ("user_id", "account_id", "provider", "messageId", "threadId", "from", "subject", "body", "embedding")
        VALUES
          ($1, $2, $3, $4, $5, $6, $7, $8, $9::vector)
        ON CONFLICT ("messageId") DO NOTHING
        `,
        email.userId,
        email.accountId,
        email.provider,
        email.messageId,
        email.threadId,
        email.from,
        email.subject,
        email.body,
        embeddingVector,
      );
    }
  }

  return NextResponse.json({
    success: true,
    ...result,
    unreadCount: emails.length,
    emails,
  });
}
