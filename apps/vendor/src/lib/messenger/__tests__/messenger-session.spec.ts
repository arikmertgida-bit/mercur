import { readdirSync, readFileSync } from "node:fs"
import { join, relative } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"

import { KayiEventManager } from "../KayiEventManager"

const SRC_DIR = fileURLToPath(new URL("../../../", import.meta.url))

// Only these may read the stored messenger token directly: the provider checks
// that it belongs to the active store before announcing the session, and the
// client/socket are called after that. Anything else (sidebar badges) must
// wait for useMessengerSession, or it sends the previous store's token after a
// store switch.
const TOKEN_READERS = new Set([
  "lib/messenger/auth-token.ts",
  "lib/messenger/client.ts",
  "lib/messenger/socket.ts",
  "providers/messenger-provider/MessengerProvider.tsx",
])

const sourceFiles = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) {
      return entry.name === "__tests__" ? [] : sourceFiles(path)
    }
    return /\.tsx?$/.test(entry.name) ? [path] : []
  })

describe("messenger session signal", () => {
  it("announces the seller once and on every change", () => {
    const events = new KayiEventManager()
    const seen: Array<string | null> = []
    const unsubscribe = events.subscribeSession((sellerId) => seen.push(sellerId))

    events.setSessionSellerId("sel_a")
    events.setSessionSellerId("sel_a")
    events.setSessionSellerId(null)
    events.setSessionSellerId("sel_b")
    unsubscribe()
    events.setSessionSellerId("sel_c")

    expect(seen).toEqual(["sel_a", null, "sel_b"])
    expect(events.getSessionSellerId()).toBe("sel_c")
  })

  it("keeps direct token reads inside the provider and the client", () => {
    const readers = sourceFiles(SRC_DIR)
      .filter((file) => /getMessengerAuthToken\(/.test(readFileSync(file, "utf8")))
      .map((file) => relative(SRC_DIR, file).split("\\").join("/"))
      .filter((file) => !TOKEN_READERS.has(file))
    expect(readers).toEqual([])
  })
})
