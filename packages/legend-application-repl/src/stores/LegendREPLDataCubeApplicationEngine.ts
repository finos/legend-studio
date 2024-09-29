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

import {
  shouldDisplayVirtualAssistantDocumentationEntry,
  APPLICATION_EVENT,
} from '@finos/legend-application';
import { type DocumentationEntry, LogEvent } from '@finos/legend-shared';
import {
  DataCubeApplicationEngine,
  type ActionAlert,
} from '@finos/legend-data-cube';
import type { LegendREPLApplicationStore } from '../application/LegendREPLApplicationStore.js';

export class LegendREPLDataCubeApplicationEngine extends DataCubeApplicationEngine {
  private readonly application: LegendREPLApplicationStore;

  constructor(application: LegendREPLApplicationStore) {
    super();

    this.application = application;
  }

  get documentationUrl(): string | undefined {
    return this.application.documentationService.url;
  }

  getDocumentationEntry(key: string) {
    return this.application.documentationService.getDocEntry(key);
  }

  openDocumentationEntry(entry: DocumentationEntry) {
    this.currentDocumentationEntry = entry;
  }

  shouldDisplayDocumentationEntry(entry: DocumentationEntry) {
    return shouldDisplayVirtualAssistantDocumentationEntry(entry);
  }

  openLink(url: string) {
    this.application.navigationService.navigator.visitAddress(url);
  }

  setWindowTitle(title: string) {
    this.application.layoutService.setWindowTitle(title);
  }

  blockNavigation(
    blockCheckers: (() => boolean)[],
    onBlock?: ((onProceed: () => void) => void) | undefined,
    onNativePlatformNavigationBlock?: (() => void) | undefined,
  ) {
    this.application.navigationService.navigator.blockNavigation(
      blockCheckers,
      onBlock,
      onNativePlatformNavigationBlock,
    );
  }

  unblockNavigation() {
    this.application.navigationService.navigator.unblockNavigation();
  }

  alertAction(alertInfo: ActionAlert | undefined) {
    this.currentActionAlert = alertInfo;
  }

  alertUnhandledError(error: Error) {
    this.application.alertUnhandledError(error);
  }

  logDebug(message: string, ...data: unknown[]) {
    this.application.logService.debug(
      LogEvent.create(APPLICATION_EVENT.DEBUG),
      message,
      ...data,
    );
  }

  debugProcess(processName: string, ...data: unknown[]) {
    this.application.logService.debug(
      LogEvent.create(APPLICATION_EVENT.DEBUG),
      `\n------ START DEBUG PROCESS: ${processName} ------\n`,
      ...data,
      `\n------- END DEBUG PROCESS: ${processName} -------\n`,
    );
  }

  logInfo(event: LogEvent, ...data: unknown[]) {
    this.application.logService.info(event, ...data);
  }

  logWarning(event: LogEvent, ...data: unknown[]) {
    this.application.logService.warn(event, ...data);
  }

  logError(event: LogEvent, ...data: unknown[]) {
    this.application.logService.error(event, ...data);
  }

  logUnhandledError(error: Error) {
    this.application.logUnhandledError(error);
  }

  logIllegalStateError(message: string, error?: Error) {
    this.logError(
      LogEvent.create(APPLICATION_EVENT.ILLEGAL_APPLICATION_STATE_OCCURRED),
      message,
      error,
    );
  }
}
