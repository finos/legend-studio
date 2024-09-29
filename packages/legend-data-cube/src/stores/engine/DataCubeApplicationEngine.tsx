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
import {
  Alert,
  AlertType,
  type ActionAlert,
  type ActionAlertAction,
} from '../../components/application/DataCubeAlert.js';
import {
  DEFAULT_SMALL_ALERT_WINDOW_CONFIG,
  LayoutConfiguration,
  LayoutManagerState,
  WindowState,
  type WindowConfiguration,
} from './DataCubeLayoutManagerState.js';

export abstract class DataCubeApplicationEngine {
  readonly layout: LayoutManagerState;

  currentDocumentationEntry: DocumentationEntry | undefined;
  currentActionAlert: ActionAlert | undefined;

  constructor() {
    makeObservable(this, {
      currentDocumentationEntry: observable,
      openDocumentationEntry: action,

      currentActionAlert: observable,
      alertAction: action,
    });

    this.layout = new LayoutManagerState();
  }

  abstract get documentationUrl(): string | undefined;
  abstract getDocumentationEntry(key: string): DocumentationEntry | undefined;
  abstract openDocumentationEntry(entry: DocumentationEntry): void;
  abstract shouldDisplayDocumentationEntry(entry: DocumentationEntry): boolean;

  abstract openLink(url: string): void;
  abstract setWindowTitle(title: string): void;
  abstract blockNavigation(
    blockCheckers: (() => boolean)[],
    onBlock?: ((onProceed: () => void) => void) | undefined,
    onNativePlatformNavigationBlock?: (() => void) | undefined,
  ): void;
  abstract unblockNavigation(): void;

  abstract logDebug(message: string, ...data: unknown[]): void;
  abstract debugProcess(processName: string, ...data: unknown[]): void;
  abstract logInfo(event: LogEvent, ...data: unknown[]): void;
  abstract logWarning(event: LogEvent, ...data: unknown[]): void;
  abstract logError(event: LogEvent, ...data: unknown[]): void;
  abstract logUnhandledError(error: Error): void;
  abstract logIllegalStateError(message: string, error?: Error): void;

  abstract alertAction(alertInfo: ActionAlert | undefined): void;
  abstract alertUnhandledError(error: Error): void;

  alertError(
    error: Error,
    options: {
      message: string;
      text?: string | undefined;
      actions?: ActionAlertAction[] | undefined;
      windowTitle?: string | undefined;
      windowConfig?: WindowConfiguration | undefined;
    },
  ) {
    const { message, text, actions, windowTitle, windowConfig } = options;
    const window = new WindowState(
      new LayoutConfiguration(windowTitle ?? 'Error', () => (
        <Alert
          type={AlertType.ERROR}
          message={message}
          text={text}
          actions={actions}
        />
      )),
    );
    window.configuration.window =
      windowConfig ?? DEFAULT_SMALL_ALERT_WINDOW_CONFIG;
    this.layout.newWindow(window);
  }

  alert(options: {
    message: string;
    type: AlertType;
    text?: string | undefined;
    actions?: ActionAlertAction[] | undefined;
    windowTitle?: string | undefined;
    windowConfig?: WindowConfiguration | undefined;
  }) {
    const { message, type, text, actions, windowTitle, windowConfig } = options;
    const window = new WindowState(
      new LayoutConfiguration(windowTitle ?? '', () => (
        <Alert
          type={type}
          message={message}
          text={text}
          actions={actions}
          onClose={() => this.layout.closeWindow(window)}
        />
      )),
    );
    window.configuration.window =
      windowConfig ?? DEFAULT_SMALL_ALERT_WINDOW_CONFIG;
    this.layout.newWindow(window);
  }
}
