import { handleGmailPush } from "@/app/util/gmailPush";
import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { google } from "googleapis";
import { auth } from "@/auth";

type ParsedEmail = {
  id: string;
  threadId: string | null;
  from: string;
  subject: string;
  preview: string;
  snippet: string;
  date: string;
  labels: string[];
};

type MessagePart = {
  mimeType?: string | null;
  body?: { data?: string | null } | null;
  parts?: MessagePart[] | null;
};

const decodeBase64Url = (value: string) => {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(
    normalized.length + ((4 - (normalized.length % 4)) % 4),
    "=",
  );
  return Buffer.from(padded, "base64").toString("utf8");
};

const getHeader = (
  headers: Array<{ name?: string | null; value?: string | null }> | undefined,
  name: string,
) =>
  headers?.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value ??
  "";

const extractBody = (
  payload:
    | {
        body?: { data?: string | null } | null;
        parts?: MessagePart[] | null;
      }
    | undefined,
): string => {
  if (!payload) return "";

  const walkParts = (parts: MessagePart[] | null | undefined): string => {
    if (!parts?.length) return "";
    for (const part of parts) {
      if (part?.mimeType === "text/plain" && part?.body?.data) {
        return decodeBase64Url(part.body.data);
      }
      if (part?.parts?.length) {
        const nested = walkParts(part.parts);
        if (nested) return nested;
      }
    }
    for (const part of parts) {
      if (part?.mimeType === "text/html" && part?.body?.data) {
        return decodeBase64Url(part.body.data);
      }
    }
    return "";
  };

  if (payload.body?.data) return decodeBase64Url(payload.body.data);
  return walkParts(payload.parts ?? null);
};

const fetchUnreadEmails = async (account: {
  access_token: string | null;
  refresh_token: string | null;
  expires_at: number | null;
  scope: string | null;
  token_type: string | null;
}) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("Missing GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET");
  }
  if (!account.access_token || !account.refresh_token) {
    throw new Error("Missing Google access/refresh token");
  }

  const authClient = new google.auth.OAuth2(clientId, clientSecret);
  authClient.setCredentials({
    access_token: account.access_token,
    refresh_token: account.refresh_token,
    scope: account.scope ?? undefined,
    expiry_date: account.expires_at ? account.expires_at * 1000 : undefined,
    token_type: account.token_type
      ? account.token_type.charAt(0).toUpperCase() +
        account.token_type.slice(1).toLowerCase()
      : "Bearer",
  });

  const gmail = google.gmail({ version: "v1", auth: authClient });
  const list = await gmail.users.messages.list({
    userId: "me",
    q: "is:unread -in:chats",
    maxResults: 10,
  });

  const messageRefs = list.data.messages ?? [];
  if (messageRefs.length === 0) return [] as ParsedEmail[];

  const messages = await Promise.all(
    messageRefs.map((msg) =>
      gmail.users.messages.get({
        userId: "me",
        id: msg.id!,
        format: "full",
      }),
    ),
  );

  return messages.map((m) => {
    const data = m.data;
    const headers = data.payload?.headers;
    const fullBody = extractBody(data.payload);

    return {
      id: data.id ?? "",
      threadId: data.threadId ?? null,
      from: getHeader(headers, "from"),
      subject: getHeader(headers, "subject"),
      preview: data.snippet || "",
      snippet: fullBody || data.snippet || "",
      date: getHeader(headers, "date"),
      labels: data.labelIds ?? [],
    } satisfies ParsedEmail;
  });
};

export async function POST(req: Request) {
  const body = await req.json();
  const result = await handleGmailPush(body);
  const payload = result.payload ?? {};
  const session = await auth();
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
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

  const emails = await fetchUnreadEmails(account);

  return NextResponse.json({
    success: true,
    ...result,
    unreadCount: emails.length,
    emails,
  });
}
