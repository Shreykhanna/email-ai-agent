import OpenAi from "openai";

const openAiKey = process.env.OPENAI_API_KEY;
if (!openAiKey) {
  throw new Error("OpenAI API key is not set in environment variables.");
}
const embeddingsModelInstance = new OpenAi({
  apiKey: openAiKey,
});

export const embeddingsModel = async (email: { body: string }) => {
  const response = await embeddingsModelInstance.embeddings.create({
    input: email.body,
    model: "text-embedding-3-small",
  });
  const embedding = response.data[0].embedding;
  if (!embedding) {
    throw new Error("Failed to generate embedding for email.");
  }
  return { data: [{ embedding }] };
};
