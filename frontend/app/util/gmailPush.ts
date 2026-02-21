"use server";

import { google } from "googleapis";
import { fetchAccount } from "./fetchAccount";

type GmailWatchResponse = {
  historyId?: string;
  expiration?: string;
};

type PubSubPushBody = {
  message?: {
    data?: string;
    messageId?: string;
    attributes?: Record<string, string>;
  };
  subscription?: string;
};

const getTopicName = () => {
  const fullTopic = process.env.GMAIL_PUBSUB_TOPIC;
  if (fullTopic) return fullTopic;
  const projectId = process.env.PROJECT_ID;
  const topicName = process.env.GMAIL_PUBSUB_TOPIC_NAME;
  if (!projectId || !topicName) return null;
  return `projects/${projectId}/topics/${topicName}`;
};

export const startGmailWatch = async (userId?: string) => {
  const account = await fetchAccount(userId);
  if (!account) throw new Error("No Gmail account found for user");

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("Missing GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET");
  }

  const topicName = getTopicName();
  if (!topicName) {
    throw new Error(
      "Missing GMAIL_PUBSUB_TOPIC or PROJECT_ID/GMAIL_PUBSUB_TOPIC_NAME",
    );
  }

  const authClient = new google.auth.OAuth2(clientId, clientSecret);
  authClient.setCredentials({
    access_token: account.accessToken,
    refresh_token: account.refreshToken,
    scope: account.scope!,
    expiry_date: account.expiresAt,
    token_type: account.tokenType,
  });

  const gmail = google.gmail({ version: "v1", auth: authClient });
  try {
    await gmail.users.stop({ userId: "me" });
  } catch (error) {
    // Ignore stop errors; watch may not exist yet.
    console.log("gmail.users.stop failed or not needed", error);
  }
  const response = await gmail.users.watch({
    userId: "me",
    requestBody: {
      labelIds: ["INBOX"],
      topicName,
    },
  });

  return response.data as GmailWatchResponse;
};

export const handleGmailPush = async (body: PubSubPushBody) => {
  const raw = body?.message?.data;
  if (!raw) {
    return { ok: false, error: "Missing Pub/Sub message data" };
  }

  const decoded = Buffer.from(raw, "base64").toString("utf8");
  let payload: { emailAddress?: string; historyId?: string } | null = null;
  try {
    payload = JSON.parse(decoded);
  } catch {
    payload = null;
  }

  return {
    ok: true,
    messageId: body.message?.messageId,
    subscription: body.subscription,
    payload,
  };
};
