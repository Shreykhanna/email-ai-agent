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
  resumeDecision?: { type: string }
) => {
  console.log("Starting Agent...");
  let config = { configurable: { thread_id: "1" } };

  const systemPrompt = `
You are an email assistant.You have access to two tools: read_email and draft_email.

Rules:
- You already have permission to read emails.
- DO NOT ask the user for userId, credentials, or permission.
- When asked to summarize emails, call the "summarise_email" tool.
- When asked to draft an email, call the "draft_email" tool.
- The email body must be under 120 words.
- The subject must be under 8 words.
- You may draft emails, but MUST pause for human approval before finalizing.
- When drafting an email, generate a clear, polite, and professional draft.
- Never send emails automatically.
- Assume a human will review, edit, or cancel the draft.
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

  console.error("tools", tools);

  const agent = createAgent({
    model,
    tools: tools,
    systemPrompt: systemPrompt,
    checkpointer: new MemorySaver(),
    middleware: [
      humanInTheLoopMiddleware({
        interruptOn: {
          send_email: true,
          draft_email: true,
        },
        descriptionPrefix:
          "The agent is requesting approval to draft an email. Review the content carefully before approving.",
      }),
    ],
  });

  const initialResponse = await agent.invoke(
    {
      messages: [{ role: "user", content: message }],
    },
    config
  );

  // console.log("Agent initial response interrupt:");
  // console.log(initialResponse.__interrupt__);

  // If there is an interrupt and no resumeDecision was passed, return the interrupt
  // so the caller (frontend/API) can display it to a human for approval.
  if (initialResponse.__interrupt__) {
    if (!resumeDecision) {
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
