import path from "node:path";
import { fileURLToPath, URL } from "node:url";

export const webpackOverride = (config) => {
  const root = fileURLToPath(new URL("../../", import.meta.url));
  return {
    ...config,
    resolve: {
      ...config.resolve,
      alias: {
        ...config.resolve?.alias,
        "@": path.join(root, "src"),
        "@root": root,
      },
    },
  };
};
