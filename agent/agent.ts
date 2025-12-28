import {
  createAgent,
  tool,
  initChatModel,
  humanInTheLoopMiddleware,
} from "langchain";
import { type ToolRuntime } from "@langchain/core/tools";
import * as z from "zod";
import dotenv from "dotenv";
import { Command } from "@langchain/langgraph";
import { MultiServerMCPClient } from "@langchain/mcp-adapters";
import { MemorySaver } from "@langchain/langgraph";

dotenv.config();

const userContextSchema = z.object({
  userId: z.uuid(),
  authenticated: z.boolean(),
});

let config = { configurable: { thread_id: "1" } };

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
  read_gmail: {
    transport: "stdio",
    command: "node",
    args: ["D:/projects/gmail-mcp/build/index.js"],
  },
});
const tools = await client.getTools();

console.error("tools", tools);

const summariseEmailAgent = createAgent({
  model,
  tools,
  systemPrompt: systemPrompt,
});

const draftEmailAgent = createAgent({
  model,
  tools,
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
  systemPrompt: `
You are an email assistant that drafts emails for users.
Rules:
- You MUST call the "draft_email" tool.
- The email body must be under 120 words.
- The subject must be under 8 words.
- You may draft emails, but MUST pause for human approval before finalizing.
- When drafting an email, generate a clear, polite, and professional draft.
- Never send emails automatically.
- Assume a human will review, edit, or cancel the draft.
- Do not ask for confirmation in natural language — the middleware will handle approval.
- Do not explain your reasoning.
`,
});

// const summariseEmailAgentResponse = await summariseEmailAgent.invoke({
//   messages: [{ role: "user", content: "Can you summarise my latest email?" }],
// });

const draftEmailAgentResponse = await draftEmailAgent.invoke(
  {
    messages: [
      {
        role: "user",
        content: "Please draft an email to thank John for his help.",
      },
    ],
  },
  config
);

await draftEmailAgent.invoke(
  new Command({
    resume: { decisions: [{ type: "approve" }] },
  }),
  config
);

// const summariseEmailMessage = summariseEmailAgentResponse.messages.at(-1);
// console.log("AI Message Content:", summariseEmailMessage?.content);

const draftMessage = draftEmailAgentResponse.messages.at(-1);
console.log("Draft Message Content:", draftEmailAgentResponse);
