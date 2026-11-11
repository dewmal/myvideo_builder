import { readFile } from "node:fs/promises";
import path from "node:path";
import { executeApi } from "@/helpers/api-response";
import { ProgressRequest, ProgressResponse } from "@root/types/schema";

export const runtime = "nodejs";
export const POST = executeApi<ProgressResponse, typeof ProgressRequest>(
  ProgressRequest,
  async (_req, body) => {
    if (!/^[0-9a-f-]{36}$/.test(body.id)) throw new Error("Invalid render ID.");
    return JSON.parse(
      await readFile(
        path.resolve("out/renders", body.id, "status.json"),
        "utf8",
      ),
    ) as ProgressResponse;
  },
);
