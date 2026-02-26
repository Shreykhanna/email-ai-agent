export type MessagePart = {
  mimeType?: string | null;
  body?: { data?: string | null } | null;
  parts?: MessagePart[] | null;
};

export type ParsedEmail = {
  id: string;
  threadId: string | null;
  from: string;
  subject: string;
  preview: string;
  body: string;
  date: string;
  labels: string[];
};

export type GmailWatchResponse = {
  historyId?: string;
  expiration?: string;
};

export type PubSubPushBody = {
  message?: {
    data?: string;
    messageId?: string;
    attributes?: Record<string, string>;
  };
  subscription?: string;
};
