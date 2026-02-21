import { MultiServerMCPClient } from "@langchain/mcp-adapters";
import { ChatOpenAI } from "@langchain/openai";
import path from "path";
export const model = new ChatOpenAI({
  modelName: "gpt-5-nano", // Change to your desired model
  maxTokens: 2000,
  apiKey: process.env.OPENAI_API_KEY,
});

const globalForMcp = global as unknown as { mcpClient: MultiServerMCPClient };

const serverPath = path.resolve("D:/projects/gmail-mcp/build/index.js");

export const client =
  globalForMcp.mcpClient ||
  new MultiServerMCPClient({
    email_agent: {
      transport: "stdio",
      command: "node",
      args: [serverPath],
      env: {
        ...process.env,
        NODE_ENV: "development",
      },
    },
  });

if (process.env.NODE_ENV !== "production") globalForMcp.mcpClient = client;

export async function getAgentModel() {
  const tools = await client.getTools();
  const authenticateModel = model.bindTools(tools);
  const readEmailModel = model.bindTools(tools);
  const draftEmailModel = model.bindTools(tools);
  const sendEmailModel = model.bindTools(tools);
  const summarizeEmailModel = model.bindTools(tools);
  const summariseUnreadEmailsModel = model.bindTools(tools);
  return {
    tools,
    authenticateModel,
    readEmailModel,
    draftEmailModel,
    sendEmailModel,
    summarizeEmailModel,
    summariseUnreadEmailsModel,
  };
}
// export const readEmailTool = tools.filter((tool) => tool.name === "read_email");
// export const draftEmailTool = tools.filter(
//   (tool) => tool.name === "draft_email",
// );
// export const sendEmailTool = tools.filter((tool) => tool.name === "send_email");
// export const summarizeEmailTool = tools.filter(
//   (tool) => tool.name === "summarise_email",
// );
// console.log("Summaris email tool", summarizeEmailTool);

// export const readEmailModel = model.bindTools(tools);
// export const draftEmailModel = model.bindTools(tools);
// export const sendEmailModel = model.bindTools(tools);
// export const summarizeEmailModel = model.bindTools(tools);
