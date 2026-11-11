import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { Readable } from "node:stream";
import path from "node:path";

export const runtime = "nodejs";
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id))
    return new Response("Invalid render ID", { status: 400 });
  const file = path.resolve("out/renders", id, "video.mp4");
  try {
    const info = await stat(file);
    return new Response(
      Readable.toWeb(createReadStream(file)) as ReadableStream<Uint8Array>,
      {
        headers: {
          "Content-Type": "video/mp4",
          "Content-Length": String(info.size),
          "Content-Disposition": 'attachment; filename="video.mp4"',
          "Cache-Control": "no-store",
        },
      },
    );
  } catch {
    return new Response("Video not found", { status: 404 });
  }
}
