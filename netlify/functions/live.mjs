import { buildSnapshot } from "../../dashboard/snapshot.mjs";
import { metaEnv } from "../lib/env.mjs";
import { cached, failed, hold, limited } from "../lib/hold.mjs";

const snapshot = hold();

export default async () => {
  try {
    return cached(await snapshot.load(() => buildSnapshot(metaEnv(), 60)));
  } catch (error) {
    if (snapshot.current() && limited(error)) return cached(snapshot.current());
    return failed(error);
  }
};
