import { logger } from "./logger";

type HandledError = string | Error;

export function handleError(error: HandledError) {
  logger.break();
  logger.error(
    `Something went wrong. Please check the error below for more details.`
  );
  logger.error(`If the problem persists, please open an issue on GitHub.`);
  logger.error("");

  if (typeof error === "string") {
    logger.error(error);
  } else if (error instanceof Error) {
    logger.error(error.message);
  }

  logger.break();
  process.exit(1);
}

export function handleCaughtError(error: HandledError | object): void {
  if (typeof error === "string") {
    handleError(error);
    return;
  }

  if (error instanceof Error) {
    handleError(error);
    return;
  }

  handleError(String(error));
}
