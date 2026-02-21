import express from "express";
import cors from "cors";
import { emailAgent } from "./agent/emailAgent.ts";
import { BuiltInState, type Interrupt } from "langchain";

const app = express();
const port = process.env.PORT || 4000;
app.use(cors());
app.use(express.json());
console.log("CORS and JSON middleware applied");

type AgentResponse =
  | Omit<BuiltInState, "jumpTo">
  | {
      interrupt: Interrupt<unknown>[];
    };

app.post("/email-agent", async (req, res) => {
  const { message, data = "", decision = "" } = req.body;

  console.log("MEssage,data", message, data, decision);
  try {
    const response: AgentResponse = (await emailAgent(message, data, {
      type: decision,
    })) as AgentResponse;

    if ("interrupt" in response && response.interrupt) {
      const actionRequest = (response as any).interrupt[0]?.value
        ?.actionRequests?.[0];

      console.log("Action rquests", actionRequest);

      // Return the tool arguments (the draft content) to the frontend
      return res.json({
        status: "requires_action",
        tool: actionRequest?.toolName,
        args: actionRequest?.args,
      });
    }

    // 2. Otherwise, check for a final text message
    if ("messages" in response && Array.isArray(response.messages)) {
      const lastMessage = (response as any).messages.at(-1);
      const aiText = lastMessage?.content as string | undefined;

      if (aiText) {
        console.log("AI Text Response:", aiText);
        return res.json({ status: "success", reply: aiText });
      }
    }

    res.status(500).json({ error: "No usable response from agent" });

    // Access the .content property directly
  } catch (err: any) {
    res.status(500).json({ error: String(err) });
  }
});

// app.post("/email-agent/resume", async (req, res) => {
//   const { message, decision } = req.body;
//   try {
//     const resumed = await emailAgent(message, "", decision);
//     res.json(resumed);
//   } catch (err: any) {
//     res.status(500).json({ error: String(err) });
//   }
// });

app.post("/email-agent/send-email", async (req, res) => {
  let message = "Send email to the person mentioned in the data";
  const { body } = req.body;
  console.log("data", body.toString());
  const dataWithTags = `
    <email_context>
    ${body}
    </email_context>
`;

  try {
    // Call with resumeDecision to approve send_email action
    const result = await emailAgent(message, dataWithTags, { type: "approve" });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
