import chalk from "chalk";

enum Level {
  ERROR ,
  WARN,
  INFO,
  DEBUG,
}

const level = Level.INFO;

export default {
  debug(...it: any[]) {
    if (level < Level.DEBUG) return;
    console.log(chalk.grey(...it));
  },
  info(...it: any[]) {
    if (level < Level.INFO) return;
    console.log(chalk.white(...it));
  },
  warn(...it: any[]) {
    if (level < Level.WARN) return;
    console.log(it.map(chalk.red));
  },
  error(...it: any[]) {
    if (level < Level.ERROR) return;
    console.log(it.map(chalk.red));
  },
}
