import { NextRequest, NextResponse } from "next/server";
import { emailAgent } from "../../../../src/lib/agent/emailAgent";

export async function POST(request: NextRequest) {
  try {
    const { body } = await request.json();

    const message = "Send email to the person mentioned in the data";
    console.log("Email body:", body);

    const dataWithTags = `
    <email_context>
    ${body}
    </email_context>
`;

    // Call with resumeDecision to approve send_email action
    const result = await emailAgent(message, dataWithTags, { type: "approve" });

    return NextResponse.json(result);
  } catch (err: any) {
    console.error("Error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
