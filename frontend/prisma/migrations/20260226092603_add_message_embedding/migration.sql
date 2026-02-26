
CREATE EXTENSION IF NOT EXISTS vector;
-- CreateTable
CREATE TABLE "MessageEmbedding" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "account_id" TEXT,
    "provider" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "threadId" TEXT,
    "from" TEXT,
    "subject" TEXT,
    "body" TEXT NOT NULL,
    "embedding" vector(1536) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MessageEmbedding_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MessageEmbedding_messageId_key" ON "MessageEmbedding"("messageId");

-- CreateIndex
CREATE INDEX "MessageEmbedding_user_id_provider_idx" ON "MessageEmbedding"("user_id", "provider");

-- AddForeignKey
ALTER TABLE "MessageEmbedding" ADD CONSTRAINT "MessageEmbedding_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
