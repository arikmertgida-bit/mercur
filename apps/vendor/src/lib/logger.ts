function write(level: "info" | "warn" | "error", message: string): void {
  const line = `[vendor:${level}] ${message}`
  const c = console
  if (level === "info") {
    c.log(line)
  } else if (level === "warn") {
    c.warn(line)
  } else {
    c.error(line)
  }
}

export const logger = {
  info: (message: string): void => {
    write("info", message)
  },
  error: (message: string): void => {
    write("error", message)
  },
  warn: (message: string): void => {
    write("warn", message)
  },
} as const
