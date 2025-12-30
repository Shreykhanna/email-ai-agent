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
  const response = await emailAgent(message);
  const summariseEmailMessage = response.messages.at(-1);
  res.json(summariseEmailMessage?.content);
});

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
