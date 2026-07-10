function write(level: "info" | "warn" | "error", message: string): void {
  const line = `[admin:${level}] ${message}`
  const c = console
  if (level === "info") {
    c.info(line)
  } else if (level === "warn") {
    c.warn(line)
  } else {
    c.error(line)
  }
}

interface Logger {
  readonly info: (message: string) => void
  readonly error: (message: string) => void
  readonly warn: (message: string) => void
}

export const logger: Logger = {
  info: (message: string): void => {
    write("info", message)
  },
  error: (message: string): void => {
    write("error", message)
  },
  warn: (message: string): void => {
    write("warn", message)
  },
}
