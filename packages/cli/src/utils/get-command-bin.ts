import * as path from "path";
import { readFileSync } from "fs";
import { packageDirectory } from "pkg-dir";
import resolveCwd from "resolve-cwd";
import { z } from "zod";

const PackageBinSchema = z.object({
  bin: z.union([z.string(), z.record(z.string(), z.string())]).optional(),
});

const readPackageBin = (pkgDir: string, pkg: string) => {
  try {
    return PackageBinSchema.parse(
      JSON.parse(readFileSync(path.join(pkgDir, "package.json"), "utf-8"))
    ).bin;
  } catch (error) {
    throw new Error(`Could not read package.json for '${pkg}'`, { cause: error });
  }
};

export async function resolveBinAsync(pkg: string, executable = pkg) {
  const resolved = resolveCwd(pkg);
  const pkgDir = await packageDirectory({ cwd: resolved });

  if (!pkgDir) throw new Error(`Could not find package.json for '${pkg}'`);

  const bin = readPackageBin(pkgDir, pkg);
  const binPath = typeof bin === "object" ? bin[executable] : bin;

  if (!binPath) throw new Error(`No bin '${executable}' in module '${pkg}'`);

  return path.join(pkgDir, binPath);
}

export async function getCommandBin(
  command: string,
  executable: string = command,
  rootFolder: string = process.cwd()
): Promise<string> {
  const bin = await resolveBinAsync(command, executable);
  return path.resolve(rootFolder, bin);
}
