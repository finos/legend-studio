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

import packageJson from '../../package.json' with { type: 'json' };
import { type LogEvent, LoggerPlugin } from './LogService.js';

const { debug, info, warn, error } = console;

export class WebConsole extends LoggerPlugin {
  constructor() {
    super(packageJson.extensions.webConsoleLoggerPlugin, packageJson.version);
  }

  _debug(event: LogEvent, ...data: unknown[]): void {
    debug(
      `[${event.timestamp}] ${event.name} ${data.length ? ':' : ''}`,
      ...data,
    );
  }

  _info(event: LogEvent, ...data: unknown[]): void {
    info(
      `[${event.timestamp}] ${event.name} ${data.length ? ':' : ''}`,
      ...data,
    );
  }

  _warn(event: LogEvent, ...data: unknown[]): void {
    warn(
      `[${event.timestamp}] ${event.name} ${data.length ? ':' : ''}`,
      ...data,
    );
  }

  _error(event: LogEvent, ...data: unknown[]): void {
    error(
      `[${event.timestamp}] ${event.name} ${data.length ? ':' : ''}`,
      ...data,
    );
  }
}
