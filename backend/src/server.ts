import express from "express";
import cors from "cors";
import { emailAgent } from "./agent/emailAgent.ts";

const app = express();
const port = process.env.PORT || 4000;
app.use(cors());
app.use(express.json());
console.log("CORS and JSON middleware applied");

app.post("/email-agent", async (req, res) => {
  const { message } = req.body;
  try {
    const response = await emailAgent(message);
    console.log("Full Agent Response:", response);
    if (response && response.interrupt) {
      console.log("Handle Interrupt Logic...");
      const actionRequest = response.interrupt[0]?.value?.actionRequests?.[0];

      // Return the tool arguments (the draft content) to the frontend
      return res.json({
        status: "requires_action",
        tool: actionRequest?.toolName,
        args: actionRequest?.args,
      });
    }

    // 2. Otherwise, check for a final text message
    if (response && response.messages) {
      const lastMessage = response.messages.at(-1);
      const aiText = lastMessage?.content;

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

app.post("/email-agent/resume", async (req, res) => {
  const { message, decision } = req.body;
  try {
    const resumed = await emailAgent(message, { type: decision });
    res.json(resumed);
  } catch (err: any) {
    res.status(500).json({ error: String(err) });
  }
});

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
