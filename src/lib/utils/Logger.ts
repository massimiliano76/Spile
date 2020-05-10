import { formatWithOptions } from "util";

import chalk from "chalk";
import SonicBoom from "sonic-boom";

import { streamSupportsColour } from "./utils";

interface MethodColours {
  [k: string]: chalk.Chalk;
}

interface ConsoleLogMethods {
  debug: (...any: any[]) => void;
  info: (...any: any[]) => void;
  warn: (...any: any[]) => void;
  error: (...any: any[]) => void;
}

// Used for type checking on class building.
// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface LoggerMethods extends ConsoleLogMethods { }

// Used to superimpose methods over the Logger class.
// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface Logger extends LoggerMethods { }

export enum LoggerLevels {
  DEBUG,
  INFO,
  WARN,
  ERROR,
}

const METHOD_COLOURS: MethodColours = {
  debug: chalk.grey,
  info: chalk.cyan,
  warn: chalk.yellow,
  error: chalk.red,
};

class Logger {
  public static stdout?: SonicBoom;

  private static registeredNames: string[] = [];

  private name?: string;
  private levelMin: LoggerLevels;

  // Although it is unlikely we will not supply a name, we should allow this to enable modularity.
  public constructor(name?: string, levelMin?: LoggerLevels, fd?: string | number, childName?: string);
  public constructor(
    name?: string | LoggerLevels,
    levelMin: string | LoggerLevels = LoggerLevels.INFO,
    private fd?: string | number,
    childName?: string,
  ) {
    const nameType = typeof name;

    if (nameType === "undefined" && typeof levelMin === "undefined") levelMin = LoggerLevels.INFO;
    if (name in LoggerLevels) levelMin = name;
    else if (nameType === "string") name = chalk.green((name as string).toLowerCase());

    if (name) {
      if (Logger.registeredNames.includes(name as string)) {
        this.warn(`Can not register a logger with ambiguous name ${name}. No name will be used.`);
        name = void 0;
      }

      if (childName) name += ` ${chalk.gray(">")} ${chalk.green(childName.toLowerCase())}`;
      Logger.registeredNames.push(name as string);
    }

    this.name = name as string | undefined;
    this.levelMin = levelMin as LoggerLevels;

    let i = 0;

    this.fd = fd || (process.stdout as unknown as { fd: number }).fd;

    if (!Logger.stdout) Logger.stdout = new SonicBoom({ fd: this.fd } as any);

    const stdoutColours = streamSupportsColour(process.stdout);

    for (const [lvl, colFn] of Object.entries(METHOD_COLOURS)) {
      const levelIndex = i;

      this[lvl as keyof LoggerMethods] = (...args: any[]): void => {
        if (levelIndex >= levelMin) {
          let logStr = formatWithOptions(
            { colors: stdoutColours },
            this.formatString(lvl, colFn),
            ...args,
          );

          logStr += "\n";

          Logger.stdout.write(logStr);
        }
      };

      i++;
    }
  }

  public child(name: string): Logger {
    return new Logger(this.name, this.levelMin, this.fd, name);
  }

  public close(): void {
    Logger.stdout.end();
  }

  public destroySyncUnsafe(): void {
    try {
      Logger.stdout.flushSync();
    } finally {
      Logger.stdout.destroy();
    }
  }

  private formatString(levelName: keyof MethodColours, colourMethod: chalk.Chalk): string {
    const currentTime = new Date();

    // eslint-disable-next-line max-len
    return `${chalk.bold.magenta(currentTime.toLocaleTimeString("en-GB"))}${this.name ? ` ${this.name}` : ""} ${colourMethod(levelName)}`;
  }
}

export default Logger;
