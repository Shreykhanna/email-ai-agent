import { InMemoryStore } from "@langchain/langgraph";

export type WhatsAppMemoryMessage = {
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
};

export const memoryStore = new InMemoryStore();

const getNamespace = (userId: string | null) => [
  "whatsapp",
  userId ?? "unknown_user",
];

const getMessageKey = (message: WhatsAppMemoryMessage) => {
  if (message.messageId) return message.messageId;
  return `${message.from ?? "unknown_from"}-${message.timestamp ?? Date.now()}`;
};

export const saveWhatsAppMessagesToMemoryStore = async (
  messages: WhatsAppMemoryMessage[],
) => {
  for (const message of messages) {
    await memoryStore.put(
      getNamespace(message.userId),
      getMessageKey(message),
      {
        ...message,
        receivedAt: new Date().toISOString(),
      },
    );
  }
};

export const getWhatsAppMessagesFromMemoryStore = async (
  userId: string,
  limit = 50,
) => {
  const items = await memoryStore.search(["whatsapp", userId], { limit });
  console.log("items", items);
  return items.map((item) => item.value);
};
