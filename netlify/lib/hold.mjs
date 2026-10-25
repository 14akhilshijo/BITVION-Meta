const FRESH_MS = 90000;

export function limited(error) {
  return /limit/i.test(error?.message || "");
}

export function hold() {
  let value = null;
  let at = 0;
  let inflight = null;

  return {
    current() {
      return value;
    },
    fresh() {
      return value && Date.now() - at < FRESH_MS ? value : null;
    },
    async load(read) {
      const hit = this.fresh();
      if (hit) return hit;
      if (!inflight) {
        inflight = Promise.resolve()
          .then(read)
          .then((data) => {
            value = data;
            at = Date.now();
            return data;
          })
          .finally(() => {
            inflight = null;
          });
      }
      return inflight;
    },
  };
}

export function cached(data) {
  return Response.json(data, {
    headers: {
      "cache-control": "public, max-age=0, must-revalidate",
      "netlify-cdn-cache-control": "public, max-age=90, stale-while-revalidate=60",
    },
  });
}

export function failed(error) {
  const message = error?.message || "Meta did not answer";
  return Response.json(
    { error: message },
    {
      status: limited(error) ? 429 : 502,
      headers: {
        "cache-control": "no-store",
        "netlify-cdn-cache-control": "no-store",
        "retry-after": limited(error) ? "600" : "180",
      },
    }
  );
}
