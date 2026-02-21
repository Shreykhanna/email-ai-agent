import { handleGmailPush } from "@/app/util/gmailPush";
import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { agent } from "@/src/lib/agent/graph";
import { HumanMessage } from "langchain";
import { convertSegmentPathToStaticExportFilename } from "next/dist/shared/lib/segment-cache/segment-value-encoding";

export async function POST(req: Request) {
  // TODO : IMPLEMENT SQS QUEUE
  const body = await req.json();
  console.log("Body", body);
  const result = await handleGmailPush(body);
  console.log("result", result);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  console.log("Pub/Sub push received");

  const emailAddress = result.payload?.emailAddress;
  console.log("Email address", emailAddress);
  if (!emailAddress) {
    return NextResponse.json({ success: true, ...result });
  }

  const user = await prisma.user.findUnique({
    where: { email: emailAddress },
  });
  console.log("User", user);

  //   if (!user) {
  //     return NextResponse.json({ success: true, ...result, user: "not_found" });
  //   }

  const account = await prisma.account.findFirst({
    where: {
      userId: "cml0qy7g60000v8fowvldjgmq",
      provider: "google",
    },
  });

  if (!account) {
    return NextResponse.json({
      success: true,
      ...result,
      account: "not_found",
    });
  }

  const runnableConfig = {
    metadata: {
      accessToken: account.access_token,
      refreshToken: account.refresh_token,
      expiresAt: account.expires_at,
      scope: account.scope,
      tokenType: account.token_type,
    },
  };

  const data = await agent.invoke(
    {
      messages: [new HumanMessage("Summarise unread emails.")],
    },
    runnableConfig,
  );
  console.log("*****DATA*****");
  console.log(data.messages[data.messages.length - 1].content);
  return NextResponse.json({
    success: true,
    ...result,
    user: "cml0qy7g60000v8fowvldjgmq",
  });
}
