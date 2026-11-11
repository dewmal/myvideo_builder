import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile, open, readFile } from "node:fs/promises";
import path from "node:path";
import { executeApi } from "@/helpers/api-response";
import { RenderRequest } from "@root/types/schema";

export const runtime = "nodejs";

export const POST = executeApi<Response, typeof RenderRequest>(
  RenderRequest,
  async (_req, body) => {
    const renderId = randomUUID();
    const directory = path.resolve("out/renders", renderId);
    await mkdir(directory, { recursive: true });
    await writeFile(
      path.join(directory, "props.json"),
      JSON.stringify(body.inputProps),
    );
    await writeFile(
      path.join(directory, "status.json"),
      JSON.stringify({ type: "progress", progress: 0 }),
    );
    const log = await open(path.join(directory, "render.log"), "a");
    try {
      const child = spawn(
        process.execPath,
        [path.resolve("scripts/render-local.mjs"), directory],
        {
          cwd: process.cwd(),
          detached: true,
          windowsHide: true,
          stdio: ["ignore", log.fd, log.fd],
        },
      );
      await new Promise<void>((resolve, reject) => {
        child.once("spawn", resolve);
        child.once("error", reject);
      });
      child.unref();
      child.once("exit", (code) => {
        if (code === 0) return;
        void (async () => {
          const statusPath = path.join(directory, "status.json");
          const status = JSON.parse(await readFile(statusPath, "utf8"));
          if (status.type === "progress") {
            await writeFile(
              statusPath,
              JSON.stringify({
                type: "error",
                message:
                  "Local renderer stopped unexpectedly. Check out/renders/" +
                  renderId +
                  "/render.log.",
              }),
            );
          }
        })().catch(console.error);
      });
    } finally {
      await log.close();
    }
    return new Response(
      JSON.stringify({ type: "started", renderId, bucketName: "local" }) + "\n",
      {
        headers: {
          "Content-Type": "application/x-ndjson",
          "Cache-Control": "no-store",
        },
      },
    );
  },
);
