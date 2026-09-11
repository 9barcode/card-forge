export type AppLogLevel = 'INFO' | 'WARN' | 'ERROR';

export interface AppLogEntry {
  timestamp: string;
  level: AppLogLevel;
  tag: string;
  message: string;
}

const MAX_LOG_ENTRIES = 300;
const logEntries: AppLogEntry[] = [];

function stringifyDetail(detail: unknown): string {
  if (detail === undefined) {
    return '';
  }

  if (detail instanceof Error) {
    return `${detail.name}: ${detail.message}`;
  }

  if (typeof detail === 'string') {
    return detail;
  }

  try {
    return JSON.stringify(detail);
  } catch {
    return String(detail);
  }
}

function writeLog(
  level: AppLogLevel,
  tag: string,
  message: string,
  detail?: unknown,
): void {
  const detailText = stringifyDetail(detail);
  const fullMessage = detailText.length > 0 ? `${message} | ${detailText}` : message;
  const entry: AppLogEntry = {
    timestamp: new Date().toISOString(),
    level,
    tag,
    message: fullMessage,
  };

  logEntries.push(entry);
  if (logEntries.length > MAX_LOG_ENTRIES) {
    logEntries.splice(0, logEntries.length - MAX_LOG_ENTRIES);
  }

  const consoleMessage = `[${entry.timestamp}] [${level}] [${tag}] ${fullMessage}`;
  if (level === 'ERROR') {
    console.error(consoleMessage);
  } else if (level === 'WARN') {
    console.warn(consoleMessage);
  } else {
    console.log(consoleMessage);
  }
}

export const appLogger = {
  info(tag: string, message: string, detail?: unknown): void {
    writeLog('INFO', tag, message, detail);
  },

  warn(tag: string, message: string, detail?: unknown): void {
    writeLog('WARN', tag, message, detail);
  },

  error(tag: string, message: string, detail?: unknown): void {
    writeLog('ERROR', tag, message, detail);
  },

  getEntries(): AppLogEntry[] {
    return [...logEntries];
  },

  getText(): string {
    return logEntries
      .map(
        (entry) =>
          `[${entry.timestamp}] [${entry.level}] [${entry.tag}] ${entry.message}`,
      )
      .join('\n');
  },

  clear(): void {
    logEntries.splice(0, logEntries.length);
  },
};
