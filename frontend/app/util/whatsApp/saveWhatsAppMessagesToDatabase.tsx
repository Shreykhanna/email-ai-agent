import { embeddingsModel } from "@/app/models/embeddingsModel/embeddingsModel";
import { prisma } from "@/src/lib/prisma";
type WhatsAppMessage = {
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
}[];
export const saveWhatsAppMessagesToDatabase = async (
  messages: WhatsAppMessage,
) => {
  console.log("Saving WhatsApp messages to database:", messages);
  const messagesToStore = await Promise.all(
    messages.map(async (msg) => {
      const embeddingResponse = await embeddingsModel({ body: msg.text! });
      return {
        messageId: msg.messageId,
        userId: msg.userId,
        accountId: msg.providerAccountId,
        provider: "whatsapp",
        threadId: null, // WhatsApp doesn't have threads like email, so this can be null or you can implement your own logic to group messages into threads
        from: msg.from,
        subject: null, // WhatsApp messages typically don't have a subject, so this can be null
        body: msg.text,
        embedding: embeddingResponse.data?.[0]?.embedding ?? [],
      };
    }),
  );

  for (const message of messagesToStore) {
    if (!message.userId || !message.messageId) continue;
    if (!Array.isArray(message.embedding) || message.embedding.length === 0)
      continue;

    const embeddingVector = `[${message.embedding.join(",")}]`;
    await prisma.$executeRawUnsafe(
      `
      INSERT INTO "MessageEmbedding"
        ("id", "user_id", "account_id", "provider", "messageId", "threadId", "from", "subject", "body", "embedding")
      VALUES
        ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::vector)
      ON CONFLICT ("messageId") DO NOTHING
      `,
      crypto.randomUUID(),
      message.userId,
      message.accountId,
      message.provider,
      message.messageId,
      message.threadId,
      message.from,
      message.subject,
      message.body,
      embeddingVector,
    );
  }
  return {
    success: true,
    unreadCount: messages.length,
  };
};
