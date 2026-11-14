import fs from "fs"
import os from "os"
import path from "path"
import * as childProcess from "child_process"
import { Logger } from "@medusajs/medusa"
import CodegenModuleService from "../codegen-module-service"
import {
  resolveLocalCli,
  detectPackageRunner,
  runCodegen,
} from "../../utils"

// `jest.spyOn(module, "fn")` cannot reach these calls under the SWC
// transform: `import * as` of a CommonJS module is a copy, so spying on it
// never touches what utils.ts calls, and an ES module's exports are
// non-configurable getters ("Cannot redefine property"). Replace the
// child_process functions in the module registry instead; utils.ts and this
// spec then share the same mocks.
jest.mock("child_process", () => ({
  ...jest.requireActual("child_process"),
  exec: jest.fn(),
  execFile: jest.fn(),
}))

type ExecCallback = (
  error: childProcess.ExecException | null,
  stdout: string,
  stderr: string
) => void

const execFileMock = jest.mocked(childProcess.execFile)
const execMock = jest.mocked(childProcess.exec)

/** Every spawn answers with this result; returns a fake child process. */
const answerSpawns = (
  error: childProcess.ExecException | null,
  stderr = ""
): void => {
  const reply = (...args: ReadonlyArray<ExecCallback | object | string | string[] | undefined>) => {
    const callback = args.find(
      (arg): arg is ExecCallback => typeof arg === "function"
    )
    callback?.(error, "", stderr)
    return {} as childProcess.ChildProcess
  }
  execFileMock.mockImplementation(reply as typeof childProcess.execFile)
  execMock.mockImplementation(reply as typeof childProcess.exec)
}

describe("CodegenModuleService", () => {
  const originalEnv = { ...process.env }
  let tempDir: string

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "mercur-codegen-test-"))
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true })
    process.env = originalEnv
    execFileMock.mockReset()
    execMock.mockReset()
    jest.mocked(mockLogger.warn).mockClear()
  })

  const mockLogger = {
    warn: jest.fn(),
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  } as unknown as Logger

  describe("resolveLocalCli", () => {
    it("resolves installed @mercurjs/cli entry point from cwd", () => {
      const cliDir = path.join(tempDir, "node_modules", "@mercurjs", "cli")
      fs.mkdirSync(cliDir, { recursive: true })
      const entryFile = path.join(cliDir, "index.js")
      fs.writeFileSync(entryFile, "// entry")
      fs.writeFileSync(
        path.join(cliDir, "package.json"),
        JSON.stringify({ name: "@mercurjs/cli", main: "index.js" })
      )

      const resolved = resolveLocalCli(tempDir)
      expect(resolved).toBe(entryFile)
    })

    it("returns null when @mercurjs/cli is not resolvable", () => {
      const emptyDir = path.join(tempDir, "isolated")
      fs.mkdirSync(emptyDir, { recursive: true })

      expect(resolveLocalCli(emptyDir)).toBeNull()
    })
  })

  describe("detectPackageRunner", () => {
    it("detects bunx from npm_config_user_agent", () => {
      process.env.npm_config_user_agent = "bun/1.1.20 npm/? node/v22.0.0 linux x64"
      expect(detectPackageRunner(tempDir)).toBe("bunx")
    })

    it("detects pnpm dlx from npm_config_user_agent", () => {
      process.env.npm_config_user_agent = "pnpm/9.0.0 npm/? node/v22.0.0 linux x64"
      expect(detectPackageRunner(tempDir)).toBe("pnpm dlx")
    })

    it("detects npx from npm_config_user_agent for other managers", () => {
      process.env.npm_config_user_agent = "npm/10.5.0 node/v22.0.0 linux x64"
      expect(detectPackageRunner(tempDir)).toBe("npx")
    })

    it("walks parent directories to find bun.lock when user agent is unset", () => {
      delete process.env.npm_config_user_agent
      const rootDir = path.join(tempDir, "workspace-root")
      const apiDir = path.join(rootDir, "apps", "api")
      fs.mkdirSync(apiDir, { recursive: true })
      fs.writeFileSync(path.join(rootDir, "bun.lock"), "")

      expect(detectPackageRunner(apiDir)).toBe("bunx")
    })

    it("walks parent directories to find bun.lockb when user agent is unset", () => {
      delete process.env.npm_config_user_agent
      const rootDir = path.join(tempDir, "workspace-root")
      const apiDir = path.join(rootDir, "apps", "api")
      fs.mkdirSync(apiDir, { recursive: true })
      fs.writeFileSync(path.join(rootDir, "bun.lockb"), "")

      expect(detectPackageRunner(apiDir)).toBe("bunx")
    })

    it("walks parent directories to find pnpm-lock.yaml when user agent is unset", () => {
      delete process.env.npm_config_user_agent
      const rootDir = path.join(tempDir, "workspace-root")
      const apiDir = path.join(rootDir, "packages", "api")
      fs.mkdirSync(apiDir, { recursive: true })
      fs.writeFileSync(path.join(rootDir, "pnpm-lock.yaml"), "")

      expect(detectPackageRunner(apiDir)).toBe("pnpm dlx")
    })

    it("falls back to npx when no ancestor lockfile is found", () => {
      delete process.env.npm_config_user_agent
      const emptyDir = path.join(tempDir, "isolated")
      fs.mkdirSync(emptyDir, { recursive: true })

      expect(detectPackageRunner(emptyDir)).toBe("npx")
    })
  })

  describe("runCodegen", () => {
    it("executes local CLI with execFile when resolved", async () => {
      const cliDir = path.join(tempDir, "node_modules", "@mercurjs", "cli")
      fs.mkdirSync(cliDir, { recursive: true })
      const entryFile = path.join(cliDir, "index.js")
      fs.writeFileSync(entryFile, "// entry")
      fs.writeFileSync(
        path.join(cliDir, "package.json"),
        JSON.stringify({ name: "@mercurjs/cli", main: "index.js" })
      )
      answerSpawns(null)

      await runCodegen(tempDir)

      expect(execFileMock).toHaveBeenCalledTimes(1)
      expect(execFileMock.mock.calls[0][0]).toBe(process.execPath)
      expect(execFileMock.mock.calls[0][1]).toEqual([entryFile, "codegen"])
      expect(execFileMock.mock.calls[0][2]).toEqual({ cwd: tempDir, timeout: 15000 })
      expect(execMock).not.toHaveBeenCalled()
    })

    it("rejects with explicit timeout message when execution times out", async () => {
      const cliDir = path.join(tempDir, "node_modules", "@mercurjs", "cli")
      fs.mkdirSync(cliDir, { recursive: true })
      const entryFile = path.join(cliDir, "index.js")
      fs.writeFileSync(entryFile, "// entry")
      fs.writeFileSync(
        path.join(cliDir, "package.json"),
        JSON.stringify({ name: "@mercurjs/cli", main: "index.js" })
      )
      answerSpawns(Object.assign(new Error("Command failed"), { killed: true }))

      await expect(runCodegen(tempDir)).rejects.toThrow(
        "Codegen timed out after 15s"
      )
    })

    it("rejects with error message on execution failure", async () => {
      const cliDir = path.join(tempDir, "node_modules", "@mercurjs", "cli")
      fs.mkdirSync(cliDir, { recursive: true })
      const entryFile = path.join(cliDir, "index.js")
      fs.writeFileSync(entryFile, "// entry")
      fs.writeFileSync(
        path.join(cliDir, "package.json"),
        JSON.stringify({ name: "@mercurjs/cli", main: "index.js" })
      )
      answerSpawns(new Error("Compilation error"), "Compilation error")

      await expect(runCodegen(tempDir)).rejects.toThrow("Compilation error")
    })

    it("falls back to package runner via exec when local CLI is not found", async () => {
      const emptyDir = path.join(tempDir, "isolated")
      fs.mkdirSync(emptyDir, { recursive: true })
      process.env.npm_config_user_agent = "bun/1.1.20"
      answerSpawns(null)

      await runCodegen(emptyDir)

      expect(execMock).toHaveBeenCalledTimes(1)
      expect(execMock.mock.calls[0][0]).toBe("bunx @mercurjs/cli codegen")
      expect(execMock.mock.calls[0][1]).toEqual({ cwd: emptyDir })
      expect(execFileMock).not.toHaveBeenCalled()
    })
  })

  // The service calls the real runCodegen(process.cwd()); whether that CLI
  // resolves locally (execFile) or through a runner (exec), both are mocked.
  describe("onApplicationStart", () => {
    const spawned = (): number =>
      execFileMock.mock.calls.length + execMock.mock.calls.length

    it("skips codegen when NODE_ENV is production", async () => {
      process.env.NODE_ENV = "production"
      answerSpawns(null)
      const service = new CodegenModuleService({ logger: mockLogger })

      await service.onApplicationStart()
      expect(spawned()).toBe(0)
    })

    it("skips codegen when MERCUR_DEV_CODEGEN is false", async () => {
      process.env.NODE_ENV = "development"
      process.env.MERCUR_DEV_CODEGEN = "false"
      answerSpawns(null)
      const service = new CodegenModuleService({ logger: mockLogger })

      await service.onApplicationStart()
      expect(spawned()).toBe(0)
    })

    it("runs codegen in development and logs warnings on failure without throwing", async () => {
      process.env.NODE_ENV = "development"
      delete process.env.MERCUR_DEV_CODEGEN
      answerSpawns(new Error("Command failed"))
      const service = new CodegenModuleService({ logger: mockLogger })

      await expect(service.onApplicationStart()).resolves.toBeUndefined()
      expect(spawned()).toBe(1)
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining("Codegen failed: Command failed")
      )
    })

    it("logs timeout warning without throwing when codegen times out", async () => {
      process.env.NODE_ENV = "development"
      delete process.env.MERCUR_DEV_CODEGEN
      answerSpawns(Object.assign(new Error("Command failed"), { killed: true }))
      const service = new CodegenModuleService({ logger: mockLogger })

      await expect(service.onApplicationStart()).resolves.toBeUndefined()
      const viaExecFile = execFileMock.mock.calls.length === 1
      expect(mockLogger.warn).toHaveBeenCalledWith(
        viaExecFile
          ? "Codegen failed: Codegen timed out after 15s"
          : "Codegen failed: Command failed"
      )
    })
  })
})
