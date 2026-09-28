/** Deterministic PRNG so mock data is stable across server and client renders. */
function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return function random() {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function hashString(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i++) {
    hash = Math.imul(hash ^ input.charCodeAt(i), 16777619);
  }
  return hash >>> 0;
}

/** Combines numbers/strings into a single seed and returns a repeatable [0, 1) generator. */
export function seededRandom(...parts: Array<number | string>): () => number {
  let seed = 2166136261;
  for (const part of parts) {
    const n = typeof part === "string" ? hashString(part) : part | 0;
    seed = Math.imul(seed ^ n, 16777619);
  }
  return mulberry32(seed);
}
