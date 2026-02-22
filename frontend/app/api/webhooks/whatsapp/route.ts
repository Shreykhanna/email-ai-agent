import { NextRequest, NextResponse } from "next/server";
import {
  getWhatsAppMessagesFromMemoryStore,
  saveWhatsAppMessagesToMemoryStore,
} from "@/src/lib/agent/memoryStore/memoryStore";
import { prisma } from "@/src/lib/prisma";
import { isValidSignature } from "../util/isValidSignature";

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
    phoneNumberId: string | null;
  }> = [];
  const statuses: Array<{
    messageId: string | null;
    status: string | null;
    recipientId: string | null;
    timestamp: string | null;
    phoneNumberId: string | null;
  }> = [];
  const profile: Array<{
    name: string;
    username: string;
  }> = [];
  const userIdByPhoneNumberId = new Map<string, string | null>();

  for (const entry of entries) {
    const changes = Array.isArray(entry?.changes) ? entry.changes : [];
    for (const change of changes) {
      const value = change?.value ?? {};
      const phoneNumberId = value?.metadata?.phone_number_id ?? null;
      let ownerUserId: string | null = null;
      if (phoneNumberId) {
        if (userIdByPhoneNumberId.has(phoneNumberId)) {
          ownerUserId = userIdByPhoneNumberId.get(phoneNumberId) ?? null;
        } else {
          const account = await prisma.account.findFirst({
            where: {
              provider: "whatsapp",
              providerAccountId: phoneNumberId,
            },
            select: { userId: true },
          });
          ownerUserId = account?.userId ?? null;
          userIdByPhoneNumberId.set(phoneNumberId, ownerUserId);
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
          phoneNumberId,
        });
      }
    }
  }

  if (messages.length > 0)
    console.log("[whatsapp-webhook] first message:", messages[0]);

  await saveWhatsAppMessagesToMemoryStore(messages);

  await getWhatsAppMessagesFromMemoryStore(messages[0].userId!, 50);

  return NextResponse.json({
    ok: true,
    messageCount: messages.length,
    statusCount: statuses.length,
    messages,
    statuses,
  });
}
