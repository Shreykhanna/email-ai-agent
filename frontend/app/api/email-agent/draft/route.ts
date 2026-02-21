import { NextRequest, NextResponse } from "next/server";
import { agent } from "@/src/lib/agent/graph";
import { HumanMessage } from "langchain";

const draft = async (request: NextRequest, response: NextResponse) => {
  const { message } = await request.json();

  try {
    const result = await agent.invoke({
      messages: [new HumanMessage(message)],
    });

    const draft = result.messages[result.messages.length - 1].content;
    return NextResponse.json({
      success: true,
      data: draft,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
};
