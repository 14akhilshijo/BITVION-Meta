import { buildSnapshot } from "../../dashboard/snapshot.mjs";
import { metaEnv } from "../lib/env.mjs";

export default async () => {
  try {
    const data = await buildSnapshot(metaEnv(), 60);
    return Response.json(data, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    return Response.json({ error: error.message || "Snapshot failed" }, { status: 502, headers: { "cache-control": "no-store" } });
  }
};
