import {
  createAgent,
  initChatModel,
  humanInTheLoopMiddleware,
} from "langchain";
import { type ToolRuntime } from "@langchain/core/tools";
import dotenv from "dotenv";
import { Command } from "@langchain/langgraph";
import { MultiServerMCPClient } from "@langchain/mcp-adapters";
import { MemorySaver } from "@langchain/langgraph";

dotenv.config();

let config = { configurable: { thread_id: "1" } };
const model = await initChatModel("gpt-5-nano", { maxTokens: 2000 });

const client = new MultiServerMCPClient({
  read_gmail: {
    transport: "stdio",
    command: "node",
    args: ["D:/projects/gmail-mcp/build/index.js"],
  },
});
const tools = await client.getTools();

export const draftEmailAgent = createAgent({
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

// const draftMessage = draftEmailAgentResponse.messages.at(-1);
// console.log("Draft Message Content:", draftEmailAgentResponse);
