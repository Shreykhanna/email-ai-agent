import express from "express";
import cors from "cors";
import { summariseEmailAgent } from "./agent/summariseEmail.ts";
import { draftEmail } from "./agent/draftEmail.ts";

const app = express();
const port = process.env.PORT || 4000;
app.use(cors());
app.use(express.json());
console.log("CORS and JSON middleware applied");

app.post("/summarise-email", async (req, res) => {
  const { message } = req.body;
  const response = await summariseEmailAgent(message);
  const summariseEmailMessage = response.messages.at(-1);
  res.json(summariseEmailMessage?.content);
});

app.post("/draft-email", async (req, res) => {
  const { message } = req.body;
  const response = await draftEmail.invoke({
    messages: [{ role: "user", content: message }],
  });
  console.log("Draft Response:", response);
  res.json(response);
});

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
