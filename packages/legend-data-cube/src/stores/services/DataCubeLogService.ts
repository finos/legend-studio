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

import type { LogEvent } from '@finos/legend-shared';
import type { DataCubeEngine } from '../core/DataCubeEngine.js';

export class DataCubeLogService {
  private readonly _engine: DataCubeEngine;

  constructor(engine: DataCubeEngine) {
    this._engine = engine;
  }

  logDebug(message: string, ...data: unknown[]) {
    this._engine.logDebug(message, ...data);
  }

  debugProcess(processName: string, ...data: [string, unknown][]) {
    this._engine.debugProcess(processName, ...data);
  }

  logInfo(event: LogEvent, ...data: unknown[]) {
    this._engine.logInfo(event, ...data);
  }

  logWarning(event: LogEvent, ...data: unknown[]) {
    this._engine.logWarning(event, ...data);
  }

  logError(event: LogEvent, ...data: unknown[]) {
    this._engine.logError(event, ...data);
  }

  logUnhandledError(error: Error) {
    this._engine.logUnhandledError(error);
  }

  logIllegalStateError(message: string, error?: Error) {
    this._engine.logIllegalStateError(message, error);
  }
}
