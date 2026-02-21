import { ToolNode } from "@langchain/langgraph/prebuilt";
import { getAgentModel } from "./config";

const { tools } = await getAgentModel();

export const draftEmailToolNode = new ToolNode(tools);
export const readEmailToolNode = new ToolNode(tools);
export const sendEmailToolNode = new ToolNode(tools);
export const summarizeEmailsToolNode = new ToolNode(tools);
export const authenticateGmailToolNode = new ToolNode(tools);
export const summarizeUnreadEmailsToolNode = new ToolNode(tools);
