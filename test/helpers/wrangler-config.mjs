import { readFileSync } from "node:fs";
import { parse } from "smol-toml";

export const repoFile = (path) => new URL(`../../${path}`, import.meta.url);

export function wranglerConfig() {
  return parse(readFileSync(repoFile("wrangler.toml"), "utf8"));
}
