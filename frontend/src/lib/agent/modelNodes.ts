import {
  GraphNode,
  StateSchema,
  MessagesValue,
  ReducedValue,
  MessagesAnnotation,
} from "@langchain/langgraph";
import z from "zod";
import { getAgentModel } from "./config";
import { RunnableConfig } from "@langchain/core/runnables";
const MessagesState = new StateSchema({
  messages: MessagesValue,
  llmCalls: new ReducedValue(z.number().default(0), {
    reducer: (x, y) => x + y,
  }),
});

const { readEmailModel, draftEmailModel, sendEmailModel, summarizeEmailModel } =
  await getAgentModel();

export const authenticateGmailNode: GraphNode<typeof MessagesState> = async (
  state,
  config: RunnableConfig,
) => {
  const { accessToken, expiresAt, refreshToken, tokenType, scope } =
    config.metadata || {};
  const systemPrompt = `
     - You are an email assistant.
     - You must call authenticate_gmail tool before any email reading or summarizing.
     - Do not ask the user for credentials or permissions.
     - Use authenticate_gmail tool.
     - Use these credentials for the tool arguments:
      . accessToken: ${accessToken}
      . refreshToken: ${refreshToken}
      . expiresAt : ${expiresAt}
      . tokenType: ${tokenType}
      . scope : ${scope}
      . clientId : ${process.env.GOOGLE_CLIENT_ID}
      . clientSecret: ${process.env.GOOGLE_CLIENT_SECRET}
    `;
  const response = await summarizeEmailModel.invoke([
    {
      role: "system",
      content: systemPrompt,
    },
    ...state.messages,
  ]);
  return { messages: [response] };
};

export const summariseUnreadEmailsNode: GraphNode<
  typeof MessagesState
> = async (state: typeof MessagesAnnotation.State, config: RunnableConfig) => {
  const { accessToken, expiresAt, refreshToken, tokenType, scope } =
    config.metadata || {};
  const systemPrompt = `
    - You are an EMAIL ASSISTANT specialits at reading unread emails and summarising them.
    - Call authenticate before for authentication to gmail api's.
    - When asked to summarise unread emails DO NOT ASK FOR PERMISSIONS.
    - Summarise email in 4-6 points.
    - Use summarise_unread_email tool.
    - Use these credentials for the tool arguments:
      . accessToken: ${accessToken}
      . refreshToken: ${refreshToken}
      . expiresAt : ${expiresAt}
      . tokenType: ${tokenType}
      . scope : ${scope}
      . clientId : ${process.env.GOOGLE_CLIENT_ID}
      . clientSecret: ${process.env.GOOGLE_CLIENT_SECRET}
    `;
  const response = await summarizeEmailModel.invoke([
    {
      role: "system",
      content: systemPrompt,
    },
    ...state.messages,
  ]);
  return { messages: [response] };
};

export const summariseEmailsNode: GraphNode<typeof MessagesState> = async (
  state: typeof MessagesAnnotation.State,
  config: RunnableConfig,
) => {
  // Access the config you passed to invoke
  //   const { accessToken, expiresAt, refreshToken, tokenType, scope } =
  //     config.metadata || {};
  const systemPrompt = `
     - You are an EMAIL ASSISTANT specialists at reading emails and summarising them.
     - Call authenticate node before calling summarise node.
     - You are authorised and access to user gmail account.
     - When asked to summarise emails DO NOT ASK FOR PERMISSIONS.
     - Summarise emails in 4-6 points.
     - Use summarise_email tool.
    `;
  const response = await summarizeEmailModel.invoke([
    {
      role: "system",
      content: systemPrompt,
    },
    ...state.messages,
  ]);
  return { messages: [response] };
};

export const draftEmailNode: GraphNode<typeof MessagesState> = async (
  state,
) => {
  const systemPrompt = `
    - You are a specialists at the drafting emails.
    `;
  const response = await draftEmailModel.invoke([
    {
      role: "system",
      content: systemPrompt,
    },
    ...state.messages,
  ]);
  return { messages: [response] };
};

export const sendEmailNode: GraphNode<typeof MessagesState> = async (state) => {
  const systemPrompt = `
     - You are an EMAIL ASSISTANT specialists at sending emails.
     - Call authenticate node before calling send email node.
     - When asked to send emails create a draft first and ask for user to check it.
     - Draft email in not more than 15 words.
     - Use send_email node.`;

  const response = await sendEmailModel.invoke([
    {
      role: "system",
      content: systemPrompt,
    },
    ...state.messages,
  ]);
  return { messages: [response] };
};
