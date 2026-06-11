type LogLevel = "debug" | "info" | "warn" | "error";

const LEVEL_RANK: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

function configuredLevel(): LogLevel {
  const raw = process.env.LOG_LEVEL?.trim().toLowerCase();
  if (raw === "debug" || raw === "info" || raw === "warn" || raw === "error") {
    return raw;
  }
  return process.env.NODE_ENV === "production" ? "warn" : "debug";
}

function shouldLog(level: LogLevel): boolean {
  return LEVEL_RANK[level] >= LEVEL_RANK[configuredLevel()];
}

export const log = {
  debug(...args: unknown[]): void {
    if (shouldLog("debug")) console.log(...args);
  },
  info(...args: unknown[]): void {
    if (shouldLog("info")) console.log(...args);
  },
  warn(...args: unknown[]): void {
    if (shouldLog("warn")) console.warn(...args);
  },
  error(...args: unknown[]): void {
    if (shouldLog("error")) console.error(...args);
  },
};
