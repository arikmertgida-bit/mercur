import { getConfig } from "@/src/utils/get-config";
import { getProjectInfo } from "@/src/utils/get-project-info";
import { handleCaughtError } from "@/src/utils/handle-error";
import { logger } from "@/src/utils/logger";
import { Command } from "commander";

export const info = new Command()
  .name("info")
  .description("get information about your project")
  .option(
    "-c, --cwd <cwd>",
    "the working directory. defaults to the current directory.",
    process.cwd()
  )
  .action(async (opts) => {
    try {
      logger.info("> project info");
      process.stdout.write(String(await getProjectInfo(opts.cwd)) + "\n");
      logger.break();
      logger.info("> blocks.json");
      process.stdout.write(String(await getConfig(opts.cwd)) + "\n");
    } catch (error) {
      handleCaughtError(error);
    }
  });
