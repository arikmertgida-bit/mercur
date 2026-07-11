import { highlighter } from "./highlighter";

const writeln = (stream: NodeJS.WriteStream, message: string) => {
  stream.write(message + "\n");
};

const formatArgs = (...args: (string | number | boolean | Error)[]) =>
  args
    .map((arg) => (arg instanceof Error ? arg.message : String(arg)))
    .join(" ");

export const logger = {
  error(...args: (string | number | boolean | Error)[]) {
    writeln(process.stderr, highlighter.error(formatArgs(...args)));
  },
  warn(...args: (string | number | boolean | Error)[]) {
    writeln(process.stdout, highlighter.warn(formatArgs(...args)));
  },
  info(...args: (string | number | boolean | Error)[]) {
    writeln(process.stdout, highlighter.info(formatArgs(...args)));
  },
  success(...args: (string | number | boolean | Error)[]) {
    writeln(process.stdout, highlighter.success(formatArgs(...args)));
  },
  log(...args: (string | number | boolean | Error)[]) {
    writeln(process.stdout, formatArgs(...args));
  },
  break() {
    writeln(process.stdout, "");
  },
};
