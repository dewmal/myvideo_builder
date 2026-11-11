import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import { readFile, writeFile, rename, stat, rm } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { webpackOverride } from "../src/remotion/webpack-override.mjs";

const directory = process.argv[2];
const id = path.basename(directory);
const statusPath = path.join(directory, "status.json");
const update = async (value) => {
  await writeFile(`${statusPath}.tmp`, JSON.stringify(value));
  await rename(`${statusPath}.tmp`, statusPath);
};
let pending = Promise.resolve();
try {
  const inputProps = JSON.parse(
    await readFile(path.join(directory, "props.json"), "utf8"),
  );
  const serveUrl = await bundle({
    entryPoint: path.resolve("src/remotion/index.ts"),
    outDir: path.join(directory, "bundle"),
    webpackOverride,
  });
  const composition = await selectComposition({
    serveUrl,
    id: "DynamicComp",
    inputProps,
  });
  const outputLocation = path.join(directory, "video.mp4");
  let lastProgress = 0;
  await renderMedia({
    composition,
    serveUrl,
    inputProps,
    outputLocation,
    codec: "h264",
    concurrency: 2,
    onProgress: ({ progress }) => {
      if (progress - lastProgress < 0.01) return;
      lastProgress = progress;
      pending = pending
        .then(() => update({ type: "progress", progress }))
        .catch(() => {});
    },
  });
  await pending;
  await update({
    type: "done",
    url: `/api/render/${id}`,
    size: (await stat(outputLocation)).size,
  });
} catch (error) {
  await pending;
  await update({
    type: "error",
    message: error instanceof Error ? error.message : String(error),
  });
  process.exitCode = 1;
} finally {
  await rm(path.join(directory, "bundle"), { recursive: true, force: true });
  await rm(path.join(directory, "props.json"), { force: true });
}
