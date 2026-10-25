import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function fromFile() {
  const file = path.join(root, ".env.meta-ads");
  if (!fs.existsSync(file)) return {};
  const env = {};
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const match = line.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) continue;
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    env[match[1]] = value;
  }
  return env;
}

export function metaEnv() {
  const file = fromFile();
  return {
    META_APP_ID: process.env.META_APP_ID || file.META_APP_ID || "",
    META_APP_SECRET: process.env.META_APP_SECRET || file.META_APP_SECRET || "",
    META_ACCESS_TOKEN: process.env.META_ACCESS_TOKEN || file.META_ACCESS_TOKEN || "",
    META_API_VERSION: process.env.META_API_VERSION || file.META_API_VERSION || "v21.0",
  };
}
