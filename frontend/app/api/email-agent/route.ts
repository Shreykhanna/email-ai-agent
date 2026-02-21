import { NextRequest, NextResponse } from "next/server";
import { emailAgent } from "../../../src/lib/agent/emailAgent";
import { BuiltInState, type Interrupt } from "langchain";

type AgentResponse =
  | Omit<BuiltInState, "jumpTo">
  | {
      interrupt: Interrupt<unknown>[];
    };

export async function POST(request: NextRequest) {
  try {
    const { message, data = "", decision = "" } = await request.json();

    console.log("Message, data, decision:", message, data, decision);

    const response: AgentResponse = (await emailAgent(message, data, {
      type: decision,
    })) as AgentResponse;

    if ("interrupt" in response && response.interrupt) {
      const actionRequest = (response as any).interrupt[0]?.value
        ?.actionRequests?.[0];

      console.log("Action requests:", actionRequest);

      // Return the tool arguments (the draft content) to the frontend
      return NextResponse.json({
        status: "requires_action",
        tool: actionRequest?.toolName,
        args: actionRequest?.args,
      });
    }

    // Otherwise, check for a final text message
    if ("messages" in response && Array.isArray(response.messages)) {
      const lastMessage = (response as any).messages.at(-1);
      const aiText = lastMessage?.content as string | undefined;

      if (aiText) {
        console.log("AI Text Response:", aiText);
        return NextResponse.json({ status: "success", reply: aiText });
      }
    }

    return NextResponse.json(
      { error: "No usable response from agent" },
      { status: 500 },
    );
  } catch (err: any) {
    console.error("Error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
