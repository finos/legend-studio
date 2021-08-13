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
  level: LOG_LEVEL = LOG_LEVEL.DEBUG;
  previousLevelBeforeMuting: LOG_LEVEL = LOG_LEVEL.DEBUG;

  setLogLevel(level: LOG_LEVEL): void {
    this.level = level;
  }

  /**
   * Mute logging, if a level is specified, mute all event of lower severity than that level
   */
  mute(level?: LOG_LEVEL): void {
    this.previousLevelBeforeMuting = this.level;
    this.level = level ?? LOG_LEVEL.SILENT;
  }

  unmute(): void {
    this.level = this.previousLevelBeforeMuting;
  }

  protected abstract _debug(event: string, ...data: unknown[]): void;
  protected abstract _info(event: string, ...data: unknown[]): void;
  protected abstract _warn(event: string, ...data: unknown[]): void;
  protected abstract _error(event: string, ...data: unknown[]): void;

  debug(event: string, ...data: unknown[]): void {
    this.level > LOG_LEVEL.DEBUG ? undefined : this._debug(event, data);
  }

  info(event: string, ...data: unknown[]): void {
    this.level > LOG_LEVEL.INFO ? undefined : this._info(event, data);
  }

  warn(event: string, ...data: unknown[]): void {
    this.level > LOG_LEVEL.WARN ? undefined : this._warn(event, data);
  }

  error(event: string, ...data: unknown[]): void {
    this.level > LOG_LEVEL.ERROR ? undefined : this._error(event, data);
  }
}
