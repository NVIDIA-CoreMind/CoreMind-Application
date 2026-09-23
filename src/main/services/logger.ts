export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

class Logger {
  private level: LogLevel = LogLevel.DEBUG;

  setLevel(level: LogLevel) {
    this.level = level;
  }

  private formatMessage(level: string, message: string, meta?: unknown): string {
    const timestamp = new Date().toISOString();
    const metaStr = meta !== undefined ? ` | ${JSON.stringify(meta)}` : '';
    return `[${timestamp}] [${level}] [CoreMind] ${message}${metaStr}`;
  }

  debug(message: string, meta?: unknown) {
    if (this.level <= LogLevel.DEBUG) {
      console.debug(this.formatMessage('DEBUG', message, meta));
    }
  }

  info(message: string, meta?: unknown) {
    if (this.level <= LogLevel.INFO) {
      console.info(this.formatMessage('INFO', message, meta));
    }
  }

  warn(message: string, meta?: unknown) {
    if (this.level <= LogLevel.WARN) {
      console.warn(this.formatMessage('WARN', message, meta));
    }
  }

  error(message: string, meta?: unknown) {
    if (this.level <= LogLevel.ERROR) {
      console.error(this.formatMessage('ERROR', message, meta));
    }
  }
}

export const logger = new Logger();
