import { handleGmailPush } from "@/app/util/gmailPush";
import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { classifyEmailNode } from "@/src/lib/agent/modelNodes";
import { fetchUnreadEmails } from "@/app/util/fetchUnreadEmails/fetchUnreadEmails";
import { embeddingsModel } from "@/app/models/embeddingsModel/embeddingsModel";
import crypto from "crypto";
import { appendFile, mkdir } from "node:fs/promises";
import path from "node:path";

type History = {
  userId: string;
  startHistoryId: string;
  maxResults: number;
  pageToken?: string;
  historyTypes: string[];
};

const auditLogPath = path.join(
  process.cwd(),
  "logs",
  "message-embedding-audit.log",
);

const appendAuditLog = async (line: string) => {
  await mkdir(path.dirname(auditLogPath), { recursive: true });
  await appendFile(
    auditLogPath,
    `${new Date().toISOString()} ${line}\n`,
    "utf8",
  );
};

export async function POST(req: Request) {
  const body = await req.json();
  const result = await handleGmailPush(body);
  const payload = result.payload ?? {};

  if (!result.ok) {
    console.error("Invalid Pub/Sub payload", result.error);
    return NextResponse.json({ ok: true, ignored: true }, { status: 200 });
  }
  const emailAddress = payload?.emailAddress;

  if (!emailAddress) return NextResponse.json({ ok: true }, { status: 200 });

  // const user = await prisma.user.findUnique({
  //   where: { email: emailAddress },
  // });
  // if (!user)
  //   return NextResponse.json({ ok: true, user: "not_found" }, { status: 200 });

  const account = await prisma.account.findFirst({
    where: {
      providerEmail: emailAddress,
      provider: "google",
      isActive: true,
    },
  });

  if (!account)
    return NextResponse.json(
      { ok: true, account: "not_found" },
      { status: 200 },
    );

  let emails = await fetchUnreadEmails(account, payload.historyId);

  const state = {
    currentEmails: emails, // normalized email object
    messages: [], // if node expects this
  };

  const classifiedEmails = await classifyEmailNode(state);
  const { emailsToStore } = classifiedEmails;
  console.log("Classify output", classifiedEmails);

  if (!classifiedEmails.shouldStore) {
    await appendAuditLog(
      `[SKIP-BATCH] No emails selected for storage. fetched=${emails.length}`,
    );
  }

  if (classifiedEmails.shouldStore) {
    const emailDataToStore = await Promise.all(
      emailsToStore.map(async (email) => {
        const embeddingResp = await embeddingsModel({ body: email.body || "" });
        return {
          messageId: email.id,
          userId: account.userId,
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
      try {
        const affectedRows = await prisma.$executeRawUnsafe(
          `
          INSERT INTO "MessageEmbedding"
            ("id","user_id", "account_id", "provider", "messageId", "threadId", "from", "subject", "body", "embedding")
          VALUES
            ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::vector)
          ON CONFLICT ("messageId") DO NOTHING
          `,
          crypto.randomUUID(),
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

        if (affectedRows > 0) {
          await appendAuditLog(
            `[INSERTED] messageId=${email.messageId} threadId=${email.threadId ?? ""} subject="${email.subject ?? ""} body="${email.body?.substring(0, 100) ?? ""}"`,
          );
        } else {
          await appendAuditLog(
            `[DUPLICATE-SKIPPED] messageId=${email.messageId}`,
          );
        }
      } catch (error) {
        await appendAuditLog(
          `[ERROR] messageId=${email.messageId} reason="${
            error instanceof Error ? error.message : String(error)
          }"`,
        );
        throw error;
      }
    }
  }

  return NextResponse.json({
    success: true,
    ...result,
    unreadCount: emails.length,
    emails,
  });
}
