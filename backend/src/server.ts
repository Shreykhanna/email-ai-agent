import http from "http";
import { spawn } from "child_process";

const PORT = Number(process.env.PORT ?? 2024);

const runAgent = () =>
  new Promise<string>((resolve, reject) => {
    const proc = spawn("npx", ["tsx", "src/agent/agent.ts"], { shell: true });
    let out = "";
    let err = "";
    proc.stdout.on("data", (d) => (out += d.toString()));
    proc.stderr.on("data", (d) => (err += d.toString()));
    proc.on("close", (code) => {
      if (code === 0) resolve(out || "OK");
      else reject(new Error(`exit ${code}\n${err}`));
    });
  });

const server = http.createServer(async (req, res) => {
  if (req.url === "/health") {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("ok");
    return;
  }

  try {
    const result = await runAgent();
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end(result);
  } catch (e: any) {
    res.writeHead(500, { "Content-Type": "text/plain" });
    res.end(e.stack ?? String(e));
  }
  return;

  //   res.writeHead(404).end();
});

server.listen(PORT, () =>
  console.log(`Agent server listening on http://localhost:${PORT}`)
);
