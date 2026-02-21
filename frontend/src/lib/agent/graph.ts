"user server";

import {
  START,
  END,
  StateGraph,
  MessagesAnnotation,
} from "@langchain/langgraph";
import {
  readEmailToolNode,
  sendEmailToolNode,
  draftEmailToolNode,
  summarizeEmailsToolNode,
  summarizeUnreadEmailsToolNode,
  authenticateGmailToolNode,
} from "./toolNodes";
import {
  sendEmailNode,
  draftEmailNode,
  summariseEmailsNode,
  authenticateGmailNode,
  summariseUnreadEmailsNode,
} from "./modelNodes";
import { useSession } from "next-auth/react";
import { InMemoryStore } from "@langchain/langgraph";

const { data: session } = useSession();
const userId = session?.user?.id;
const 

// 1. Use MessagesAnnotation for the state
const graph = new StateGraph(MessagesAnnotation)
  .addNode("authenticate", authenticateGmailNode)
  .addNode("authenticateTool", authenticateGmailToolNode)
  .addNode("send_email", sendEmailNode)
  .addNode("send_email_tool", sendEmailToolNode)
  .addNode("draft_email", draftEmailNode)
  .addNode("draft_email_tool", draftEmailToolNode)
  .addNode("summarise_emails_node", summariseEmailsNode)
  .addNode("summarise_emails_tool", summarizeEmailsToolNode)
  .addNode("summarise_unread_emails_node", summariseUnreadEmailsNode)
  .addNode("summarise_unread_emails_tool", summarizeUnreadEmailsToolNode)

  // 2. Logic to flow from model -> tool -> back to model (to confirm)
  .addEdge("authenticateTool", "authenticate")
  .addEdge("send_email_tool", "send_email")
  .addEdge("draft_email_tool", "draft_email")
  .addEdge("summarise_emails_tool", "summarise_emails_node")
  .addEdge("summarise_unread_emails_tool", "summarise_unread_emails_node")

  // 3. Define the starting logic
  .addConditionalEdges(START, (state) => {
    const query = String(
      state.messages[state.messages.length - 1].content,
    ).toLowerCase();
    console.log("query", query);

    if (query.includes("summarise unread")) {
      return "authenticate";
    }
    if (query.includes("summarise")) {
      return "authenticate";
    }
    if (query.includes("draft")) {
      return "draft_email";
    }
    return "send_email";
  })

  // 4. Important: Nodes must eventually point to END or the graph will hang
  .addConditionalEdges("summarise_emails_node", (state) => {
    const lastMessage = state.messages[state.messages.length - 1];
    if (
      lastMessage._getType() === "ai" &&
      (lastMessage as any).tool_calls?.length > 0
    ) {
      return "summarise_emails_tool";
    }
    return END;
  })
  .addConditionalEdges("summarise_unread_emails_node", (state) => {
    const lastMessage = state.messages[state.messages.length - 1];
    if (
      lastMessage._getType() === "ai" &&
      (lastMessage as any).tool_calls?.length > 0
    ) {
      return "summarise_unread_emails_tool";
    }
    return END;
  })
  .addConditionalEdges("authenticate", (state) => {
    const lastMessage = state.messages[state.messages.length - 1];
    if (
      lastMessage._getType() === "ai" &&
      (lastMessage as any).tool_calls?.length > 0
    ) {
      return "authenticateTool";
    }
    const query = String(
      state.messages[state.messages.length - 1].content,
    ).toLowerCase();
    if (query.includes("summarise unread")) {
      return "summarise_unread_emails_node";
    }
    return "summarise_emails_node";
  })
  .addConditionalEdges("draft_email", (state) => {
    const lastMessage = state.messages[state.messages.length - 1];
    if (
      lastMessage._getType() === "ai" &&
      (lastMessage as any).tool_calls?.length > 0
    ) {
      return "draft_email_tool";
    }
    return END;
  })
  .addConditionalEdges("send_email", (state) => {
    const lastMessage = state.messages[state.messages.length - 1];
    if (
      lastMessage._getType() === "ai" &&
      (lastMessage as any).tool_calls?.length > 0
    ) {
      return "send_email_tool";
    }
    return END;
  });

export const agent = graph.compile();
