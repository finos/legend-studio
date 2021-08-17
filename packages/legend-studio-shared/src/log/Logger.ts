/**
 * Copyright (c) 2020-present, Goldman Sachs
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

export const SKIP_LOGGING_INFO = Symbol('SKIP_LOGGING_INFO');

// We use numeric enum here for because we want to do comparison
// In order to retrieve the name of the enum we can do reverse mapping, for example: LogLevel[LogLevel.INFO] -> INFO
// https://www.typescriptlang.org/docs/handbook/enums.html#reverse-mappings
export enum LOG_LEVEL {
  DEBUG = 1,
  INFO,
  WARN,
  ERROR,
  SILENT,
}

export class LogEvent {
  channel?: string;
  name!: string;
  timestamp: number = Date.now();

  /**
   * TODO: we should make channel required and potentially name required as well, and for each
   * channel, there should be a list of known event names. Unknown event name, or wrong channel
   * will result in error.
   */
  static create(name: string): LogEvent {
    const event = new LogEvent();
    event.name = name;
    return event;
  }
}

export abstract class Logger {
  private level: LOG_LEVEL = LOG_LEVEL.DEBUG;

  setLevel(level: LOG_LEVEL): void {
    this.level = level;
  }

  protected abstract _debug(event: LogEvent, ...data: unknown[]): void;
  protected abstract _info(event: LogEvent, ...data: unknown[]): void;
  protected abstract _warn(event: LogEvent, ...data: unknown[]): void;
  protected abstract _error(event: LogEvent, ...data: unknown[]): void;

  debug(event: LogEvent, ...data: unknown[]): void {
    this.level > LOG_LEVEL.DEBUG ? undefined : this._debug(event, ...data);
  }

  info(event: LogEvent, ...data: unknown[]): void {
    this.level > LOG_LEVEL.INFO ? undefined : this._info(event, ...data);
  }

  warn(event: LogEvent, ...data: unknown[]): void {
    this.level > LOG_LEVEL.WARN ? undefined : this._warn(event, ...data);
  }

  error(event: LogEvent, ...data: unknown[]): void {
    this.level > LOG_LEVEL.ERROR ? undefined : this._error(event, ...data);
  }
}

export class Log {
  private loggers: Logger[] = [];

  registerLogger(logger: Logger): void {
    this.loggers.push(logger);
  }

  debug(event: LogEvent, ...data: unknown[]): void {
    this.loggers.forEach((logger) => logger.debug(event, ...data));
  }

  info(event: LogEvent, ...data: unknown[]): void {
    this.loggers.forEach((logger) => logger.info(event, ...data));
  }

  warn(event: LogEvent, ...data: unknown[]): void {
    this.loggers.forEach((logger) => logger.warn(event, ...data));
  }

  error(event: LogEvent, ...data: unknown[]): void {
    this.loggers.forEach((logger) => logger.error(event, ...data));
  }
}
