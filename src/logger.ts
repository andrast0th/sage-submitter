type LogLevel = "INFO" | "WARN" | "ERROR";

function formatValue(value: unknown): string {
  if (value instanceof Error) return value.stack ?? value.message;
  if (typeof value === "object" && value !== null) return JSON.stringify(value);
  return String(value);
}

function log(level: LogLevel, msgOrData: unknown, msg?: string): void {
  const ts = new Date().toISOString();
  let line: string;

  if (msg !== undefined) {
    // Called as logger.info({ foo }, "message")
    const data = msgOrData as Record<string, unknown>;
    const extras = Object.entries(data)
      .map(([k, v]) => `${k}=${formatValue(v)}`)
      .join(" ");
    line = `[${ts}] ${level}: ${msg}${extras ? " | " + extras : ""}`;
  } else {
    // Called as logger.info("message")
    line = `[${ts}] ${level}: ${formatValue(msgOrData)}`;
  }

  if (level === "ERROR") {
    process.stderr.write(line + "\n");
  } else {
    process.stdout.write(line + "\n");
  }
}

const logger = {
  info: (msgOrData: unknown, msg?: string) => log("INFO", msgOrData, msg),
  warn: (msgOrData: unknown, msg?: string) => log("WARN", msgOrData, msg),
  error: (msgOrData: unknown, msg?: string) => log("ERROR", msgOrData, msg),
};

export default logger;
