import { google } from "googleapis";
import { htmlToPlainText } from "@/app/util/htmlToPlainText/htmlToPlainText";
import { decodeBase64Url } from "@/app/util/decodeBase64/decodeBase64Url";
import { MessagePart, ParsedEmail } from "@/app/types/types";

export const fetchUnreadEmails = async (
  account: {
    access_token: string | null;
    refresh_token: string | null;
    expires_at: number | null;
    scope: string | null;
    token_type: string | null;
  },
  historyId?: string | number,
) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  console.log("HISTORY ID in FETCh UNREAD EMAILs", historyId);

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
  let messageIds: string[] = [];

  if (historyId) {
    try {
      let pageToken: string | undefined = undefined;
      const ids = new Set<string>();

      do {
        const history = await gmail.users.history.list({
          userId: "me",
          startHistoryId: String(historyId),
          maxResults: 5,
          pageToken,
          labelId: ["UNREAD", "IMPORTANT", "INBOX"],
          historyTypes: ["messageAdded"],
        });

        for (const h of history.data.history ?? []) {
          for (const m of h.messagesAdded ?? []) {
            if (m.message?.id) ids.add(m.message.id);
          }
        }

        pageToken = history.data.nextPageToken ?? undefined;
      } while (pageToken);

      messageIds = Array.from(ids);
    } catch (error) {
      console.error(
        "Failed to fetch Gmail history, falling back to unread query",
        error,
      );
    }
  }

  const messages = await Promise.all(
    messageIds.map((id) =>
      gmail.users.messages.get({
        userId: "me",
        id,
        format: "full",
      }),
    ),
  );

  if (messages.length === 0) return [] as ParsedEmail[];

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
      body: fullBody || data.snippet || "",
      date: getHeader(headers, "date"),
      labels: data.labelIds ?? [],
    } satisfies ParsedEmail;
  });
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
        return htmlToPlainText(decodeBase64Url(part.body.data));
      }
      if (part?.parts?.length) {
        const nested = walkParts(part.parts);
        if (nested) return nested;
      }
    }
    for (const part of parts) {
      if (part?.mimeType === "text/html" && part?.body?.data) {
        return htmlToPlainText(decodeBase64Url(part.body.data));
      }
    }
    return "";
  };

  if (payload.body?.data)
    return htmlToPlainText(decodeBase64Url(payload.body.data));
  return walkParts(payload.parts ?? null);
};
