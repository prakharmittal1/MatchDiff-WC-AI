import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import type { LlmInsight } from "@/lib/alpha-types";
import { envPositiveInt } from "@/lib/env";

type CacheEntry = {
  at: number;
  model: string;
  insight: LlmInsight;
};

const memory = new Map<string, CacheEntry>();

function cacheDir(): string {
  return path.join(process.cwd(), "data", "processed", "llm-cache");
}

function cachePath(key: string): string {
  return path.join(cacheDir(), `${key}.json`);
}

function cacheTtlMs(): number {
  return envPositiveInt("LLM_CACHE_TTL_MS", 6 * 60 * 60 * 1000);
}

export function llmCacheKey(model: string, prompt: string): string {
  return createHash("sha256")
    .update(`${model}\n${prompt}`)
    .digest("hex")
    .slice(0, 32);
}

export function readMemoryLlmCache(key: string): LlmInsight | null {
  const hit = memory.get(key);
  if (!hit) return null;
  if (Date.now() - hit.at > cacheTtlMs()) {
    memory.delete(key);
    return null;
  }
  return hit.insight;
}

export async function readFileLlmCache(key: string): Promise<LlmInsight | null> {
  try {
    const raw = await readFile(cachePath(key), "utf8");
    const parsed = JSON.parse(raw) as CacheEntry;
    if (Date.now() - parsed.at > cacheTtlMs()) return null;
    memory.set(key, parsed);
    return parsed.insight;
  } catch {
    return null;
  }
}

export async function writeLlmCache(
  key: string,
  model: string,
  insight: LlmInsight,
): Promise<void> {
  const entry: CacheEntry = { at: Date.now(), model, insight };
  memory.set(key, entry);

  try {
    await mkdir(cacheDir(), { recursive: true });
    await writeFile(cachePath(key), JSON.stringify(entry, null, 2), "utf8");
  } catch {
    // Read-only FS (some serverless environments): memory cache still helps.
  }
}
