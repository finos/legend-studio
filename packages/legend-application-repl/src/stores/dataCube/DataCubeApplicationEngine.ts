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

import type { LogEvent, DocumentationEntry } from '@finos/legend-shared';
import { action, makeObservable, observable } from 'mobx';
import type { ActionAlert } from '../../components/shared/Alert.js';

export abstract class DataCubeApplicationEngine {
  currentDocumentationEntry: DocumentationEntry | undefined;
  currentActionAlert: ActionAlert | undefined;

  constructor() {
    makeObservable(this, {
      currentDocumentationEntry: observable,
      openDocumentationEntry: action,

      currentActionAlert: observable,
      alertAction: action,
    });
  }

  abstract get documentationUrl(): string | undefined;
  abstract getDocumentationEntry(key: string): DocumentationEntry | undefined;
  abstract openDocumentationEntry(entry: DocumentationEntry): void;
  abstract shouldDisplayDocumentationEntry(entry: DocumentationEntry): boolean;

  abstract openLink(url: string): void;
  abstract setWindowTitle(title: string): void;

  abstract alertAction(alertInfo: ActionAlert | undefined): void;
  abstract alertUnhandledError(error: Error): void;

  abstract logDebug(message: string, ...data: unknown[]): void;
  abstract debugProcess(processName: string, ...data: unknown[]): void;
  abstract logInfo(event: LogEvent, ...data: unknown[]): void;
  abstract logWarning(event: LogEvent, ...data: unknown[]): void;
  abstract logError(event: LogEvent, ...data: unknown[]): void;
  abstract logUnhandledError(error: Error): void;
  abstract logIllegalStateError(message: string, error?: Error): void;
}
