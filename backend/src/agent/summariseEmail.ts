import { createAgent, tool, initChatModel } from "langchain";
import { type ToolRuntime } from "@langchain/core/tools";
import * as z from "zod";
import dotenv from "dotenv";
import { Command } from "@langchain/langgraph";
import { MultiServerMCPClient } from "@langchain/mcp-adapters";

dotenv.config();

const userContextSchema = z.object({
  userId: z.uuid(),
  authenticated: z.boolean(),
});

const authoriseUsersTool = tool(
  async (_, runTime: ToolRuntime<any, typeof userContextSchema>) => {
    // Mock implementation for user authorisation
    const userId = runTime.context.userId;
    if (userId) {
      return new Command({
        update: { authenticated: true },
      });
    } else {
      return new Command({
        update: { authenticated: false },
      });
    }
  },
  {
    name: "authorise_users",
    description: "Authorises a user to access their email.",
  }
);
export const summariseEmailAgent = async (message: string) => {
  console.log("Starting summariseEmailAgent...");
  const systemPrompt = `
You are an email assistant that summarises latest emails for users.
You have access to only one tool:

Rules:
- You already have permission to read emails.
- DO NOT ask the user for userId, credentials, or permission.
- When asked to summarize emails, call the "read_gmail" tool.
- Summarize the most recent email in 3–4 clear sentences.
- Do not explain your reasoning.
`;

  const model = await initChatModel("gpt-5-nano", { maxTokens: 2000 });

  const client = new MultiServerMCPClient({
    summarise_email: {
      transport: "stdio",
      command: "node",
      args: ["D:/projects/gmail-mcp/build/index.js"],
    },
  });
  const tools = await client.getTools();

  console.error("tools", tools);

  const summariseEmail = createAgent({
    model,
    tools,
    systemPrompt: systemPrompt,
  });

  const summariseEmailAgentResponse = await summariseEmail.invoke({
    messages: [{ role: "user", content: message }],
  });
  return summariseEmailAgentResponse;
  // const summariseEmailMessage = summariseEmailAgentResponse.messages.at(-1);
  // console.log("AI Message Content:", summariseEmailMessage?.content);
};
