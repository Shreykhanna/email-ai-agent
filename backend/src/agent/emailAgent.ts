import {
  createAgent,
  tool,
  initChatModel,
  humanInTheLoopMiddleware,
} from "langchain";
import { type ToolRuntime } from "@langchain/core/tools";
import * as z from "zod";
import dotenv from "dotenv";
import { Command, MemorySaver } from "@langchain/langgraph";
import { MultiServerMCPClient } from "@langchain/mcp-adapters";
import { contentFilterMiddleware } from "../guardRails/contentFilterMiddleware";

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
export const emailAgent = async (
  message: string,
  data?: string,
  resumeDecision?: { type: string }
) => {
  let config = { configurable: { thread_id: "1" } };

  const systemPrompt = `
You are an email assistant.You have access to four tools: authenticate_gmail, read_email, list_calendar_events and send_email.

Rules:
- Call authenticate_gmail tool to authenticate user first if user is not authenticated.
- DO NOT ask the user for userId, credentials, or permission.
- When asked to summarize emails, call the "summarise_email" tool.
- When asked to send an email, call "send_email" tool.
- When asked to list calendar events, call "list_calendar_events" tool.
- The email body must be under 120 words.
- The subject must be under 8 words.
- When writing email, generate a clear, polite, and professional email.
- When you receive data wrapped in <email_context> tags, call send_email.
- Assume a human will review, edit, or cancel the email.
- Do not ask for confirmation in natural language — the middleware will handle approval.
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

  const agent = createAgent({
    model,
    tools: tools,
    systemPrompt: systemPrompt,
    checkpointer: new MemorySaver(),
    middleware: [
      contentFilterMiddleware(["download", "delete", "close"]),
      humanInTheLoopMiddleware({
        interruptOn: {
          send_email: true,
        },
        descriptionPrefix:
          "The agent send email only after the approval from human in the middle",
      }),
    ],
  });

  const initialResponse = await agent.invoke(
    {
      messages: [
        { role: "user", content: message },
        { role: "user", content: data ?? "" },
      ],
    },
    config
  );

  // If there is an interrupt and no resumeDecision was passed, return the interrupt
  // so the caller (frontend/API) can display it to a human for approval.
  if (initialResponse.__interrupt__) {
    console.log("\n\n\nresumeDescision\n\n\n", resumeDecision);
    if (resumeDecision?.type === "") {
      return { interrupt: initialResponse.__interrupt__ };
    }

    // If a resume decision was provided, resume the agent with that decision.
    const resumed = await agent.invoke(
      new Command({
        resume: { decisions: [resumeDecision] },
      }),
      config
    );

    return resumed;
  }

  // No interrupt; return the normal response
  return initialResponse;
};
