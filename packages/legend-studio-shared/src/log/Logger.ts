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

export abstract class Logger {
  private level: LOG_LEVEL = LOG_LEVEL.DEBUG;

  setLevel(level: LOG_LEVEL): void {
    this.level = level;
  }

  protected abstract _debug(
    event: string | undefined,
    ...data: unknown[]
  ): void;
  protected abstract _info(event: string | undefined, ...data: unknown[]): void;
  protected abstract _warn(event: string | undefined, ...data: unknown[]): void;
  protected abstract _error(
    event: string | undefined,
    ...data: unknown[]
  ): void;

  debug(event: string | undefined, ...data: unknown[]): void {
    this.level > LOG_LEVEL.DEBUG ? undefined : this._debug(event, ...data);
  }

  info(event: string | undefined, ...data: unknown[]): void {
    this.level > LOG_LEVEL.INFO ? undefined : this._info(event, ...data);
  }

  warn(event: string | undefined, ...data: unknown[]): void {
    this.level > LOG_LEVEL.WARN ? undefined : this._warn(event, ...data);
  }

  error(event: string | undefined, ...data: unknown[]): void {
    this.level > LOG_LEVEL.ERROR ? undefined : this._error(event, ...data);
  }
}

export class Log {
  private loggers: Logger[] = [];

  registerLogger(logger: Logger): void {
    this.loggers.push(logger);
  }

  debug(event: string | undefined, ...data: unknown[]): void {
    this.loggers.forEach((logger) => logger.debug(event, ...data));
  }

  info(event: string | undefined, ...data: unknown[]): void {
    this.loggers.forEach((logger) => logger.info(event, ...data));
  }

  warn(event: string | undefined, ...data: unknown[]): void {
    this.loggers.forEach((logger) => logger.warn(event, ...data));
  }

  error(event: string | undefined, ...data: unknown[]): void {
    this.loggers.forEach((logger) => logger.error(event, ...data));
  }
}
