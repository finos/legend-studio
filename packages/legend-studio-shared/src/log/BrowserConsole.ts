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

import { Logger } from './Logger';

const { debug, info, warn, error } = console;

export class BrowserConsole extends Logger {
  _debug(event: string | undefined, ...data: unknown[]): void {
    debug(event ? (data.length ? `${event}:` : event) : '', ...data);
  }

  _info(event: string | undefined, ...data: unknown[]): void {
    info(event ? (data.length ? `${event}:` : event) : '', ...data);
  }

  _warn(event: string | undefined, ...data: unknown[]): void {
    warn(event ? (data.length ? `${event}:` : event) : '', ...data);
  }

  _error(event: string | undefined, ...data: unknown[]): void {
    error(event ? (data.length ? `${event}:` : event) : '', ...data);
  }
}
