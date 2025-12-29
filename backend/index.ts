import { Anthropic } from "@anthropic-ai/sdk/client.js";
import {
  MessageParam,
  Tool,
} from "@anthropic-ai/sdk/resources/messages/messages.mjs";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import readline from "readline/promises";
import dotenv from "dotenv";
import { OpenAI } from "@langchain/openai";

dotenv.config();

const OPEN_API_KEY = process.env.OPEN_API_KEY || "";
if (!OPEN_API_KEY) {
  throw new Error("OPEN_API_KEY is not set in environment variables");
}

class MCPClient {
  private mcpClient: Client;
  private openAIClient;
  private transport: StdioClientTransport | null = null;
  private tools: Tool[] = [];

  constructor() {
    this.openAIClient = new OpenAI({
      openAIApiKey: OPEN_API_KEY,
      temperature: 0,
    });
    this.mcpClient = new Client({ name: "mcp-client-cli", version: "0.1.0" });
  }

  connectToServer = async (serverScriptPath: string) => {
    try {
      const isJs = serverScriptPath.endsWith(".js");
      if (!isJs) {
        throw new Error("Server script must be a JavaScript file");
      }
      const command = process.execPath;
      this.transport = new StdioClientTransport({
        command,
        args: [serverScriptPath],
      });
      await this.mcpClient.connect(this.transport);
      const toolResult = await this.mcpClient.listTools();

      console.error("Tool result:", toolResult);
      this.tools = toolResult.tools.map((tool) => {
        return {
          name: tool.name,
          description: tool.description,
          input_schema: tool.inputSchema,
        };
      });
      console.log("Connected to server. Available tools:", this.tools);
    } catch (error) {
      console.error("Error connecting to server:", error);
    }
  };
  cleanup = async () => {
    await this.mcpClient.close();
  };
}
async function main() {
  if (process.argv.length < 3) {
    console.log("Usage: node index.ts <path_to_server_script>");
    return;
  }
  const mcpClient = new MCPClient();

  try {
    await mcpClient.connectToServer(process.argv[2]);
  } catch (e) {
    console.error("Error:", e);
    await mcpClient.cleanup();
    process.exit(1);
  } finally {
    await mcpClient.cleanup();
    process.exit(0);
  }
}

main();
