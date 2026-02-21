import { NextRequest, NextResponse } from "next/server";
import { agent } from "@/src/lib/agent/graph";
import { HumanMessage } from "langchain";
import { RunnableConfig } from "@langchain/core/runnables";

export async function POST(request: NextRequest) {
  try {
    const { accessToken, expiresAt, scope, tokenType, refreshToken, message } =
      await request.json();

    // Validate required fields
    if (!accessToken || !expiresAt || !scope || !tokenType || !refreshToken) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: accountId, provider, accessToken, userId",
        },
        { status: 400 },
      );
    }

    // TODO: Implement your email reading logic here
    // Example:
    // - Call Gmail API with the accessToken
    // - Parse emails
    // - Return email list
    let config: RunnableConfig = {
      metadata: {
        accessToken: accessToken,
        expiresAt: expiresAt,
        scope: scope,
        tokenType: tokenType,
        refreshToken: refreshToken,
      },
    };

    console.log("Message", message);
    const result = await agent.invoke(
      {
        messages: [new HumanMessage(message)],
      },
      (config = config),
    );
    console.log("INSIDE USER MESSAGE METHOD");
    console.log("result", result);
    console.log(result.messages[result.messages.length - 1].content);

    return NextResponse.json({
      success: true,
      data: result.messages[result.messages.length - 1].content,
    });
  } catch (error) {
    console.error("❌ Read-email API error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
