import { createAgent, tool, initChatModel } from "langchain";
import { type ToolRuntime } from "@langchain/core/tools";
import * as z from "zod";
import dotenv from "dotenv";
import { Command } from "@langchain/langgraph";

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

const summariseLatestEmailTool = tool(
  async (runTime: ToolRuntime<any, typeof userContextSchema>) => {
    // Mock implementation for summarising the latest email
    const isAuthenticated = runTime.context.authenticated;

    if (!isAuthenticated) {
      throw new Error("User is not authenticated to access their email.");
    }

    return "This is a summary of your latest email.";
  },
  {
    name: "summarise_latest_email",
    description: "Summarises the latest email in your inbox.",
  }
);

const systemPrompt = `
You are an email assistant that summarises latest emails for users.
You have access to only one tool:

- summarise_latest_email: Summarises the latest email in the user's inbox. Requires a userId (UUID) as input.

When a user requests a summary of their email, make sure you have access to their email account.
`;

const model = await initChatModel("gpt-5-nano", { maxTokens: 500 });

const emailAgent = createAgent({
  model,
  tools: [authoriseUsersTool, summariseLatestEmailTool],
  systemPrompt: systemPrompt,
  contextSchema: userContextSchema,
});

const response = await emailAgent.invoke({
  messages: [{ role: "user", content: "Can you summarise my latest email?" }],
});

console.log("Agent Response:", response);
