import express from "express";
import cors from "cors";
import { summariseEmailAgent } from "./agent/summariseEmail.ts";
import { draftEmailAgent } from "./agent/draftEmail.ts";

const app = express();
const port = 3000;
app.use(cors());
app.use(express.json());
app.post("/summarise-email", async (req, res) => {
  const { message } = req.body;
  const response = await summariseEmailAgent.invoke({
    messages: [{ role: "user", content: message }],
  });
  console.log("Summarise Response:", response);
  res.json(response);
});

app.post("/draft-email", async (req, res) => {
  const { message } = req.body;
  const response = await draftEmailAgent.invoke({
    messages: [{ role: "user", content: message }],
  });
  console.log("Draft Response:", response);
  res.json(response);
});

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
