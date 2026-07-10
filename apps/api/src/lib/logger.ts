type MedusaLoggerLike = {
  info?: (message: string) => void
  warn?: (message: string) => void
  error?: (message: string) => void
}

/** Medusa container logger surface — no `unknown` in signatures. */
export interface KayiLogger {
  info: (message: string) => void
  warn: (message: string) => void
  error: (message: string) => void
}

function writeModuleLog(level: "warn" | "error", message: string): void {
  process.stderr.write(`[kayi:${level}] ${message}\n`)
}

/** Logger for modules without Medusa DI scope (e.g. messenger helper). */
export const moduleKayiLogger: KayiLogger = {
  info: (message: string): void => {
    writeModuleLog("warn", message)
  },
  warn: (message: string): void => {
    writeModuleLog("warn", message)
  },
  error: (message: string): void => {
    writeModuleLog("error", message)
  },
}

export function resolveKayiLogger(
  scope: { resolve: (key: string) => MedusaLoggerLike }
): KayiLogger {
  const raw = scope.resolve("logger")

  return {
    info: (message: string): void => {
      if (typeof raw.info === "function") {
        raw.info(message)
      }
    },
    warn: (message: string): void => {
      if (typeof raw.warn === "function") {
        raw.warn(message)
      }
    },
    error: (message: string): void => {
      if (typeof raw.error === "function") {
        raw.error(message)
      }
    },
  }
}
