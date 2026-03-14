import { NextRequest, NextResponse } from "next/server";
import {
  getWhatsAppMessagesFromMemoryStore,
  saveWhatsAppMessagesToMemoryStore,
} from "@/src/lib/agent/memoryStore/memoryStore";
import { prisma } from "@/src/lib/prisma";
import { isValidSignature } from "../util/isValidSignature";
import { saveWhatsAppMessagesToDatabase } from "@/app/util/whatsApp/saveWhatsAppMessagesToDatabase";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");
  const verifyToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;

  if (mode === "subscribe" && token === verifyToken && challenge) {
    return new NextResponse(challenge, { status: 200 });
  }
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-hub-signature-256");
  if (!isValidSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let body: any;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON payload" },
      { status: 400 },
    );
  }

  const entries = Array.isArray(body?.entry) ? body.entry : [];
  const messages: Array<{
    userId: string | null;
    messageId: string | null;
    from: string | null;
    type: string | null;
    name: string | null;
    userName: string | null;
    text: string | null;
    timestamp: string | null;
    providerAccountId: string | null;
    phoneNumberId: string | null;
  }> = [];
  const statuses: Array<{
    messageId: string | null;
    status: string | null;
    recipientId: string | null;
    timestamp: string | null;
    providerAccountId: string | null;
    phoneNumberId: string | null;
  }> = [];
  const profile: Array<{
    name: string;
    username: string;
  }> = [];
  const userByPhoneNumberId = new Map<
    string,
    { userId: string | null; providerAccountId: string | null }
  >();

  for (const entry of entries) {
    const changes = Array.isArray(entry?.changes) ? entry.changes : [];
    for (const change of changes) {
      const value = change?.value ?? {};
      const phoneNumberId = value?.metadata?.phone_number_id ?? null;
      let ownerUserId: string | null = null;
      let accountProviderAccountId: string | null = null;

      if (phoneNumberId) {
        if (userByPhoneNumberId.has(phoneNumberId)) {
          const cached = userByPhoneNumberId.get(phoneNumberId)!;
          ownerUserId = cached.userId;
          accountProviderAccountId = cached.providerAccountId;
        } else {
          const account = await prisma.account.findFirst({
            where: {
              provider: "whatsapp",
              phoneNumberId,
            },
            select: {
              userId: true,
              providerAccountId: true,
            },
          });
          ownerUserId = account?.userId ?? null;
          accountProviderAccountId = account?.providerAccountId ?? null;
          userByPhoneNumberId.set(phoneNumberId, {
            userId: ownerUserId,
            providerAccountId: accountProviderAccountId,
          });
        }
      }
      const contacts = value?.contacts ? value.contacts : [];

      for (const contact of contacts) {
        profile.push({
          name: contact.profile.name,
          username: contact.profile.username,
        });
      }
      const inboundMessages = Array.isArray(value?.messages)
        ? value.messages
        : [];
      for (const message of inboundMessages) {
        messages.push({
          userId: ownerUserId,
          messageId: message?.id ?? null,
          from: message?.from ?? null,
          type: message?.type ?? null,
          name: profile[0]?.name,
          userName: profile[0]?.username,
          text:
            message?.text?.body ??
            message?.button?.text ??
            message?.interactive?.button_reply?.title ??
            message?.interactive?.list_reply?.title ??
            null,
          timestamp: message?.timestamp ?? null,
          providerAccountId: accountProviderAccountId,
          phoneNumberId,
        });
      }

      const messageStatuses = Array.isArray(value?.statuses)
        ? value.statuses
        : [];
      for (const status of messageStatuses) {
        statuses.push({
          messageId: status?.id ?? null,
          status: status?.status ?? null,
          recipientId: status?.recipient_id ?? null,
          timestamp: status?.timestamp ?? null,
          providerAccountId: accountProviderAccountId,
          phoneNumberId,
        });
      }
    }
  }

  if (messages.length > 0) {
    console.log("[whatsapp-webhook] first message:", messages[0]);
  }

  await saveWhatsAppMessagesToDatabase(messages);

  // await saveWhatsAppMessagesToMemoryStore(messages);

  // if (messages.length > 0 && messages[0].userId) {
  //   await getWhatsAppMessagesFromMemoryStore(messages[0].userId, 50);
  // }

  return NextResponse.json({
    ok: true,
    messageCount: messages.length,
    statusCount: statuses.length,
    messages,
    statuses,
  });
}
